import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { sql, type Customer, type PledgeWithCustomer, type ShopProfile } from "@/lib/db";
import { computePledge, todayUtc, toUtcDate } from "@/lib/pledge-calc";

const STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  due_soon: "يقترب انتهاء الاسترداد",
  overdue: "متأخرة",
  forfeited: "ملك المحل",
  redeemed: "تم الاسترداد",
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F766E" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  row.height = 22;
}

function toDateOrNull(value: string | Date | null): Date | null {
  if (value === null) return null;
  return toUtcDate(value);
}

/** exceljs only exposes data validation per-cell (no range-level API in this version's types). */
function applyColumnValidation(
  ws: ExcelJS.Worksheet,
  col: string,
  fromRow: number,
  toRow: number,
  dv: ExcelJS.DataValidation
) {
  for (let r = fromRow; r <= toRow; r++) {
    ws.getCell(`${col}${r}`).dataValidation = dv;
  }
}

export async function GET() {
  const [customersRaw, pledgesRaw, shopProfileRaw] = await Promise.all([
    sql`SELECT * FROM customers ORDER BY created_at`,
    sql`
      SELECT p.*, c.full_name AS customer_full_name, c.national_id AS customer_national_id, c.phone AS customer_phone
      FROM pledges p
      JOIN customers c ON c.id = p.customer_id
      ORDER BY p.created_at
    `,
    sql`SELECT * FROM shop_profile WHERE id = 1`,
  ]);
  const customers = customersRaw as Customer[];
  const pledges = pledgesRaw as PledgeWithCustomer[];
  const shopProfileRows = shopProfileRaw as ShopProfile[];

  const today = todayUtc();
  const shopProfile = shopProfileRows[0] ?? null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = shopProfile?.name ?? "نظام إدارة المشتريات";
  workbook.created = new Date();

  // ---------- Sheet 1: حجوزات (pledges) — same spirit/column set as the shop's
  // original tracking sheet, but built from the live database with formulas
  // that keep recalculating (day counts, accrued fee, total due) instead of a
  // frozen snapshot, and value-validation rules so it stays safe to keep
  // editing after leaving the system. ----------
  const ws = workbook.addWorksheet("حجوزات", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  const columns: { header: string; key: string; width: number }[] = [
    { header: "المجموعة", key: "family_group", width: 14 },
    { header: "رقم الفاتورة", key: "contract_number", width: 14 },
    { header: "صندوق", key: "box_number", width: 10 },
    { header: "الاسم", key: "customer_name", width: 22 },
    { header: "رقم الهوية", key: "national_id", width: 16 },
    { header: "الجنسية", key: "nationality", width: 12 },
    { header: "تاريخ إصدار الهوية", key: "id_issue_date", width: 16 },
    { header: "مصدر الهوية", key: "id_issue_place", width: 14 },
    { header: "هاتف", key: "phone", width: 14 },
    { header: "نوع القطعة", key: "item_type", width: 12 },
    { header: "الوصف", key: "item_description", width: 26 },
    { header: "الوزن (جرام)", key: "weight_grams", width: 12 },
    { header: "الرقم المرجعي", key: "reference_number", width: 14 },
    { header: "تاريخ الشراء", key: "start_date", width: 14 },
    { header: "مدة الانتظار (يوم)", key: "period_days", width: 14 },
    { header: "تاريخ الانتهاء", key: "end_date", width: 14 },
    { header: "الأيام المستهلكة", key: "days_elapsed", width: 14 },
    { header: "الأيام المتبقية", key: "days_remaining", width: 14 },
    { header: "الحالة", key: "status", width: 16 },
    { header: "مبلغ الشراء", key: "principal_amount", width: 14 },
    { header: "نسبة الاسترداد الشهرية %", key: "monthly_rate_percent", width: 16 },
    { header: "قيمة الاسترداد المتراكمة", key: "fee_accrued", width: 16 },
    { header: "إجمالي مبلغ الاسترداد اليوم", key: "total_due", width: 18 },
    { header: "مبلغ التسوية النهائي", key: "settlement_amount", width: 16 },
    { header: "تاريخ الاسترداد", key: "redeemed_at", width: 14 },
    { header: "ملاحظات", key: "notes", width: 24 },
  ];
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));
  ws.getRow(1).values = columns.map((c) => c.header);
  styleHeaderRow(ws.getRow(1));
  ws.autoFilter = { from: "A1", to: `${ws.getColumn(columns.length).letter}1` };

  const colLetter = (key: string) => ws.getColumn(key).letter;
  const N = colLetter("start_date");
  const O = colLetter("period_days");
  const T = colLetter("principal_amount");
  const U = colLetter("monthly_rate_percent");
  const Q = colLetter("days_elapsed");
  const V = colLetter("fee_accrued");

  pledges.forEach((p, i) => {
    const rowNum = i + 2;
    const computed = computePledge(p, today);
    const startDate = toUtcDate(p.start_date);

    const row = ws.getRow(rowNum);
    row.getCell("family_group").value = p.family_group ?? "";
    row.getCell("contract_number").value = p.contract_number;
    row.getCell("box_number").value = p.box_number ?? "";
    row.getCell("customer_name").value = p.customer_full_name;
    row.getCell("national_id").value = p.customer_national_id ?? "";
    row.getCell("nationality").value = "";
    row.getCell("id_issue_date").value = null;
    row.getCell("id_issue_place").value = "";
    row.getCell("phone").value = p.customer_phone ?? "";
    row.getCell("item_type").value = p.item_type;
    row.getCell("item_description").value = p.item_description;
    row.getCell("weight_grams").value = p.weight_grams ? Number(p.weight_grams) : null;
    row.getCell("reference_number").value = p.reference_number ?? "";
    row.getCell("start_date").value = startDate;
    row.getCell("start_date").numFmt = "yyyy-mm-dd";
    row.getCell("period_days").value = p.period_days;
    row.getCell("end_date").value = { formula: `${N}${rowNum}+${O}${rowNum}` };
    row.getCell("end_date").numFmt = "yyyy-mm-dd";
    row.getCell("days_elapsed").value = { formula: `MAX(TODAY()-${N}${rowNum},0)` };
    row.getCell("days_remaining").value = {
      formula: `MAX(${O}${rowNum}-(TODAY()-${N}${rowNum}),0)`,
    };
    row.getCell("status").value = STATUS_LABEL[computed.effectiveStatus] ?? computed.effectiveStatus;
    row.getCell("principal_amount").value = Number(p.principal_amount);
    row.getCell("principal_amount").numFmt = "#,##0.00";
    row.getCell("monthly_rate_percent").value = Number(p.monthly_rate_percent);
    row.getCell("fee_accrued").value = {
      formula: `${T}${rowNum}*(${U}${rowNum}/100)*(MIN(${Q}${rowNum},${O}${rowNum})/30)`,
    };
    row.getCell("fee_accrued").numFmt = "#,##0.00";
    row.getCell("total_due").value = { formula: `${T}${rowNum}+${V}${rowNum}` };
    row.getCell("total_due").numFmt = "#,##0.00";
    row.getCell("settlement_amount").value = p.settlement_amount ? Number(p.settlement_amount) : null;
    row.getCell("settlement_amount").numFmt = "#,##0.00";
    const redeemedAt = toDateOrNull(p.redeemed_at);
    row.getCell("redeemed_at").value = redeemedAt;
    row.getCell("redeemed_at").numFmt = "yyyy-mm-dd";
    row.getCell("notes").value = p.notes ?? "";
    row.font = { name: "Arial" };
  });

  // Customer national ID / id-issue-date columns above were left blank because
  // PledgeWithCustomer doesn't carry them — backfill from the customers list.
  const customerById = new Map(customers.map((c) => [c.id, c]));
  pledges.forEach((p, i) => {
    const c = customerById.get(p.customer_id);
    if (!c) return;
    const row = ws.getRow(i + 2);
    row.getCell("nationality").value = c.nationality ?? "";
    const idIssueDate = toDateOrNull(c.id_issue_date);
    row.getCell("id_issue_date").value = idIssueDate;
    row.getCell("id_issue_date").numFmt = "yyyy-mm-dd";
    row.getCell("id_issue_place").value = c.id_issue_place ?? "";
  });

  const lastRow = pledges.length + 1;
  const validationLastRow = Math.max(lastRow, 1) + 500; // headroom for rows the client adds later

  if (lastRow >= 2) {
    applyColumnValidation(ws, T, 2, validationLastRow, {
      type: "decimal",
      operator: "greaterThanOrEqual",
      formulae: [0],
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: "قيمة غير صحيحة",
      error: "مبلغ الشراء يجب ألا يكون أقل من صفر",
    });
    applyColumnValidation(ws, U, 2, validationLastRow, {
      type: "decimal",
      operator: "between",
      formulae: [0, 100],
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: "قيمة غير صحيحة",
      error: "نسبة الاسترداد الشهرية يجب أن تكون بين 0 و 100",
    });
    const weightCol = colLetter("weight_grams");
    applyColumnValidation(ws, weightCol, 2, validationLastRow, {
      type: "decimal",
      operator: "greaterThanOrEqual",
      formulae: [0],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "قيمة غير صحيحة",
      error: "الوزن يجب ألا يكون أقل من صفر",
    });
    const periodCol = colLetter("period_days");
    applyColumnValidation(ws, periodCol, 2, validationLastRow, {
      type: "whole",
      operator: "greaterThan",
      formulae: [0],
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: "قيمة غير صحيحة",
      error: "مدة الانتظار يجب أن تكون أكبر من صفر",
    });
    applyColumnValidation(ws, N, 2, validationLastRow, {
      type: "date",
      operator: "between",
      formulae: [new Date(Date.UTC(2000, 0, 1)), new Date(Date.UTC(2100, 11, 31))],
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: "تاريخ غير صحيح",
      error: "أدخل تاريخًا صحيحًا",
    });
    const idIssueCol = colLetter("id_issue_date");
    applyColumnValidation(ws, idIssueCol, 2, validationLastRow, {
      type: "date",
      operator: "between",
      formulae: [new Date(Date.UTC(1900, 0, 1)), new Date(Date.UTC(2100, 11, 31))],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "تاريخ غير صحيح",
      error: "أدخل تاريخًا صحيحًا",
    });

    // Totals row.
    const totalsRow = ws.getRow(lastRow + 2);
    totalsRow.getCell("item_description").value = "الإجمالي";
    totalsRow.getCell("item_description").font = { name: "Arial", bold: true };
    totalsRow.getCell("principal_amount").value = { formula: `SUM(${T}2:${T}${lastRow})` };
    totalsRow.getCell("principal_amount").numFmt = "#,##0.00";
    totalsRow.getCell("total_due").value = { formula: `SUM(${colLetter("total_due")}2:${colLetter("total_due")}${lastRow})` };
    totalsRow.getCell("total_due").numFmt = "#,##0.00";
    totalsRow.eachCell((cell) => {
      cell.font = { ...(cell.font ?? {}), name: "Arial", bold: true };
      cell.border = { top: { style: "thin" } };
    });
  }

  // ---------- Sheet 2: العملاء (customers) ----------
  const wsCustomers = workbook.addWorksheet("العملاء", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  const customerColumns = [
    { header: "الاسم الكامل", key: "full_name", width: 22 },
    { header: "رقم الهوية", key: "national_id", width: 16 },
    { header: "الجنسية", key: "nationality", width: 12 },
    { header: "الجوال", key: "phone", width: 14 },
    { header: "البريد الإلكتروني", key: "email", width: 22 },
    { header: "تاريخ إصدار الهوية", key: "id_issue_date", width: 16 },
    { header: "مصدر الهوية", key: "id_issue_place", width: 14 },
    { header: "تاريخ التسجيل", key: "created_at", width: 14 },
  ];
  wsCustomers.columns = customerColumns.map((c) => ({ key: c.key, width: c.width }));
  wsCustomers.getRow(1).values = customerColumns.map((c) => c.header);
  styleHeaderRow(wsCustomers.getRow(1));
  wsCustomers.autoFilter = { from: "A1", to: `${wsCustomers.getColumn(customerColumns.length).letter}1` };

  customers.forEach((c, i) => {
    const row = wsCustomers.getRow(i + 2);
    row.getCell("full_name").value = c.full_name;
    row.getCell("national_id").value = c.national_id ?? "";
    row.getCell("nationality").value = c.nationality ?? "";
    row.getCell("phone").value = c.phone ?? "";
    row.getCell("email").value = c.email ?? "";
    const idIssueDate = toDateOrNull(c.id_issue_date);
    row.getCell("id_issue_date").value = idIssueDate;
    row.getCell("id_issue_date").numFmt = "yyyy-mm-dd";
    row.getCell("id_issue_place").value = c.id_issue_place ?? "";
    row.getCell("created_at").value = toUtcDate(c.created_at);
    row.getCell("created_at").numFmt = "yyyy-mm-dd";
    row.font = { name: "Arial" };
  });

  // ---------- Sheet 3: بيانات المحل (shop profile) ----------
  const wsShop = workbook.addWorksheet("بيانات المحل", { views: [{ rightToLeft: true }] });
  wsShop.columns = [
    { key: "label", width: 20 },
    { key: "value", width: 34 },
  ];
  const shopRows: [string, string][] = [
    ["اسم المحل", shopProfile?.name ?? ""],
    ["السجل التجاري", shopProfile?.commercial_registration ?? ""],
    ["الجوال", shopProfile?.phone ?? ""],
    ["العنوان", shopProfile?.address ?? ""],
  ];
  shopRows.forEach(([label, value], i) => {
    const row = wsShop.getRow(i + 1);
    row.getCell(1).value = label;
    row.getCell(1).font = { name: "Arial", bold: true };
    row.getCell(2).value = value;
    row.getCell(2).font = { name: "Arial" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStamp = today.toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="full-data-export-${dateStamp}.xlsx"`,
    },
  });
}
