import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sql, type Customer, type PledgeWithCustomer } from "@/lib/db";
import { computePledge, todayUtc, toISODateString } from "@/lib/pledge-calc";

export async function GET() {
  const customers = (await sql`SELECT * FROM customers ORDER BY created_at`) as Customer[];
  const pledges = (await sql`
    SELECT p.*, c.full_name AS customer_full_name, c.national_id AS customer_national_id, c.phone AS customer_phone
    FROM pledges p
    JOIN customers c ON c.id = p.customer_id
    ORDER BY p.created_at
  `) as PledgeWithCustomer[];

  const today = todayUtc();

  const pledgesSheetData = pledges.map((p) => {
    const c = computePledge(p, today);
    const statusLabel = {
      active: "نشط",
      due_soon: "يقترب انتهاء الاسترداد",
      overdue: "متأخرة",
      forfeited: "ملك المحل",
      redeemed: "تم الاسترداد",
    }[c.effectiveStatus];

    return {
      "رقم الفاتورة": p.contract_number,
      "اسم العميل": p.customer_full_name,
      "رقم الهوية": p.customer_national_id,
      "جوال العميل": p.customer_phone ?? "",
      "نوع القطعة": p.item_type,
      "وصف القطعة": p.item_description,
      "الوزن (جرام)": p.weight_grams ?? "",
      "الرقم المرجعي": p.reference_number ?? "",
      "رقم الصندوق": p.box_number ?? "",
      "العائلة/المجموعة": p.family_group ?? "",
      "مبلغ الشراء": Number(p.principal_amount),
      "نسبة الاسترداد الشهرية %": Number(p.monthly_rate_percent),
      "مدة الاسترداد (يوم)": p.period_days,
      "تاريخ الشراء": toISODateString(p.start_date),
      "تاريخ انتهاء الاسترداد": c.endDate.toISOString().slice(0, 10),
      "الأيام المستهلكة": c.daysElapsed,
      "الأيام المتبقية": c.daysRemaining,
      "قيمة الاسترداد المتراكمة": Math.round(c.feeAccrued * 100) / 100,
      "إجمالي مبلغ الاسترداد اليوم": Math.round(c.totalDue * 100) / 100,
      الحالة: statusLabel,
      "تاريخ الاسترداد": toISODateString(p.redeemed_at),
      "مبلغ الاسترداد النهائي": p.settlement_amount ?? "",
      ملاحظات: p.notes ?? "",
    };
  });

  const customersSheetData = customers.map((c) => ({
    "الاسم الكامل": c.full_name,
    "رقم الهوية": c.national_id,
    الجنسية: c.nationality ?? "",
    الجوال: c.phone ?? "",
    "البريد الإلكتروني": c.email ?? "",
    "تاريخ إصدار الهوية": toISODateString(c.id_issue_date),
    "مصدر الهوية": c.id_issue_place ?? "",
    "تاريخ التسجيل": toISODateString(c.created_at),
  }));

  const workbook = XLSX.utils.book_new();
  const pledgesSheet = XLSX.utils.json_to_sheet(pledgesSheetData);
  const customersSheet = XLSX.utils.json_to_sheet(customersSheetData);
  XLSX.utils.book_append_sheet(workbook, pledgesSheet, "المشتريات");
  XLSX.utils.book_append_sheet(workbook, customersSheet, "العملاء");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const dateStamp = today.toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hussein-abdulsamad-jewelry-export-${dateStamp}.xlsx"`,
    },
  });
}
