"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  sql,
  type ContactLogWithPledge,
  type ContactMethod,
  type Customer,
  type Pledge,
  type PledgeWithCustomer,
  type ShopProfile,
} from "./db";
import { checkPassword, createSessionToken, SESSION_COOKIE } from "./auth";
import { computePledge, formatDate, todayUtc } from "./pledge-calc";

const CONTACT_METHODS: ContactMethod[] = ["phone", "whatsapp", "sms", "in_person", "other"];

// ---------- Auth ----------

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (!password || !checkPassword(password)) {
    return { error: "كلمة المرور غير صحيحة" };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- Customers ----------

export async function findCustomerByNationalId(nationalId: string): Promise<Customer | null> {
  const rows = (await sql`
    SELECT * FROM customers WHERE national_id = ${nationalId} LIMIT 1
  `) as Customer[];
  return rows[0] ?? null;
}

export async function listCustomers(search?: string): Promise<Customer[]> {
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    return (await sql`
      SELECT * FROM customers
      WHERE full_name ILIKE ${q} OR national_id ILIKE ${q} OR phone ILIKE ${q} OR email ILIKE ${q}
      ORDER BY created_at DESC
      LIMIT 200
    `) as Customer[];
  }
  return (await sql`SELECT * FROM customers ORDER BY created_at DESC LIMIT 200`) as Customer[];
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const rows = (await sql`SELECT * FROM customers WHERE id = ${id}`) as Customer[];
  return rows[0] ?? null;
}

export type CreateCustomerInput = {
  full_name: string;
  national_id: string;
  nationality?: string;
  phone?: string;
  email?: string;
  id_issue_date?: string;
  id_issue_place?: string;
};

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const rows = (await sql`
    INSERT INTO customers (full_name, national_id, nationality, phone, email, id_issue_date, id_issue_place)
    VALUES (${input.full_name}, ${input.national_id}, ${input.nationality || null}, ${input.phone || null},
            ${input.email || null}, ${input.id_issue_date || null}, ${input.id_issue_place || null})
    RETURNING *
  `) as Customer[];
  return rows[0];
}

export async function createCustomerFormAction(formData: FormData): Promise<{ error?: string }> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const national_id = String(formData.get("national_id") ?? "").trim();
  if (!full_name || !national_id) {
    return { error: "الاسم ورقم الهوية مطلوبان" };
  }
  const existing = await findCustomerByNationalId(national_id);
  if (existing) {
    return { error: "رقم الهوية مسجل مسبقًا لعميل آخر" };
  }
  const customer = await createCustomer({
    full_name,
    national_id,
    nationality: String(formData.get("nationality") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim() || undefined,
    id_issue_date: String(formData.get("id_issue_date") ?? "").trim() || undefined,
    id_issue_place: String(formData.get("id_issue_place") ?? "").trim() || undefined,
  });
  redirect(`/customers/${customer.id}`);
}

// ---------- Pledges ----------

export async function listPledges(filter?: {
  status?: "active" | "redeemed" | "forfeited" | "all";
  search?: string;
}): Promise<PledgeWithCustomer[]> {
  const search = filter?.search?.trim();
  const q = search ? `%${search}%` : null;

  const rows = (await sql`
    SELECT p.*, c.full_name AS customer_full_name, c.national_id AS customer_national_id, c.phone AS customer_phone
    FROM pledges p
    JOIN customers c ON c.id = p.customer_id
    WHERE (${q}::text IS NULL OR c.full_name ILIKE ${q} OR c.national_id ILIKE ${q} OR p.contract_number ILIKE ${q})
    ORDER BY p.created_at DESC
    LIMIT 20000
  `) as PledgeWithCustomer[];
  return rows;
}

export type PledgeStatusFilter = "all" | "active" | "due_soon" | "overdue" | "forfeited" | "redeemed";
export type PledgeSortKey =
  | "contract_number"
  | "customer_full_name"
  | "item_type"
  | "principal_amount"
  | "start_date"
  | "days_remaining"
  | "total_due";

// Raw SQL fragments, never built from user input — sortKey/status are validated against
// these fixed maps before use, so sql.unsafe() here can't be reached with attacker data.
const PLEDGE_SORT_EXPR: Record<PledgeSortKey, string> = {
  contract_number: "p.contract_number",
  customer_full_name: "c.full_name",
  item_type: "p.item_type",
  principal_amount: "p.principal_amount",
  start_date: "p.start_date",
  // Mirrors computePledge()'s daysRemaining in pledge-calc.ts — keep in sync if that changes.
  days_remaining: "GREATEST(p.period_days - GREATEST((CURRENT_DATE - p.start_date::date), 0), 0)",
  // Mirrors computePledge()'s totalDue (principal + fee accrued) in pledge-calc.ts.
  total_due:
    "p.principal_amount + p.principal_amount * (p.monthly_rate_percent / 100) * " +
    "(LEAST(GREATEST((CURRENT_DATE - p.start_date::date), 0), p.period_days) / 30.0)",
};

// Mirrors computePledge()'s effectiveStatus priority (redeemed/forfeited are stored;
// overdue/due_soon/active are date-derived from an 'active' row) in pledge-calc.ts.
const PLEDGE_STATUS_WHERE: Record<Exclude<PledgeStatusFilter, "all">, string> = {
  redeemed: "p.status = 'redeemed'",
  forfeited: "p.status = 'forfeited'",
  overdue: "p.status = 'active' AND (p.start_date::date + (p.period_days || ' days')::interval) <= CURRENT_DATE",
  due_soon:
    "p.status = 'active'" +
    " AND (p.start_date::date + (p.period_days || ' days')::interval) > CURRENT_DATE" +
    " AND (p.start_date::date + (p.period_days || ' days')::interval) <= (CURRENT_DATE + INTERVAL '7 days')",
  active:
    "p.status = 'active'" +
    " AND (p.start_date::date + (p.period_days || ' days')::interval) > (CURRENT_DATE + INTERVAL '7 days')",
};

export type PledgesPageResult = {
  rows: PledgeWithCustomer[];
  total: number;
  activeCount: number;
  principalOutstanding: number;
  dueOutstanding: number;
};

/** Server-side filtered/sorted/paginated pledge listing for the dashboard — never pulls the whole table into the page. */
export async function listPledgesPage(opts: {
  search?: string;
  status?: PledgeStatusFilter;
  sortKey?: PledgeSortKey;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}): Promise<PledgesPageResult> {
  const search = opts.search?.trim();
  const q = search ? `%${search}%` : null;
  const statusClause = opts.status && opts.status !== "all" ? PLEDGE_STATUS_WHERE[opts.status] : null;
  const orderExpr = PLEDGE_SORT_EXPR[opts.sortKey ?? "start_date"] ?? PLEDGE_SORT_EXPR.start_date;
  const dir = opts.sortDir === "asc" ? "ASC" : "DESC";
  const pageSize = opts.pageSize && opts.pageSize > 0 ? Math.min(opts.pageSize, 200) : 50;
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * pageSize;

  const [rowsRaw, countRaw, totalsRaw] = await Promise.all([
    sql`
      SELECT p.*, c.full_name AS customer_full_name, c.national_id AS customer_national_id, c.phone AS customer_phone
      FROM pledges p
      JOIN customers c ON c.id = p.customer_id
      WHERE (${q}::text IS NULL OR c.full_name ILIKE ${q} OR c.national_id ILIKE ${q} OR p.contract_number ILIKE ${q})
        ${sql.unsafe(statusClause ? `AND ${statusClause}` : "")}
      ORDER BY ${sql.unsafe(orderExpr)} ${sql.unsafe(dir)}
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) AS total
      FROM pledges p
      JOIN customers c ON c.id = p.customer_id
      WHERE (${q}::text IS NULL OR c.full_name ILIKE ${q} OR c.national_id ILIKE ${q} OR p.contract_number ILIKE ${q})
        ${sql.unsafe(statusClause ? `AND ${statusClause}` : "")}
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE p.status = 'active') AS active_count,
        COALESCE(SUM(p.principal_amount) FILTER (WHERE p.status = 'active'), 0) AS principal_outstanding,
        COALESCE(SUM(${sql.unsafe(PLEDGE_SORT_EXPR.total_due)}) FILTER (WHERE p.status = 'active'), 0) AS due_outstanding
      FROM pledges p
      JOIN customers c ON c.id = p.customer_id
      WHERE (${q}::text IS NULL OR c.full_name ILIKE ${q} OR c.national_id ILIKE ${q} OR p.contract_number ILIKE ${q})
    `,
  ]);

  const rows = rowsRaw as PledgeWithCustomer[];
  const countRows = countRaw as { total: string }[];
  const totalsRows = totalsRaw as { active_count: string; principal_outstanding: string; due_outstanding: string }[];

  return {
    rows,
    total: Number(countRows[0]?.total ?? 0),
    activeCount: Number(totalsRows[0]?.active_count ?? 0),
    principalOutstanding: Number(totalsRows[0]?.principal_outstanding ?? 0),
    dueOutstanding: Number(totalsRows[0]?.due_outstanding ?? 0),
  };
}

// ---------- Reminders ----------

export type ReminderItem = {
  pledgeId: number;
  contractNumber: string;
  customerName: string;
  daysRemaining: number;
  isOverdue: boolean;
  whatsappUrl: string | null;
};

/** Saudi mobile numbers in this DB are stored inconsistently (with/without a leading 0 or 966); best-effort normalize to E.164 digits for wa.me. */
function normalizeSaudiPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits.startsWith("966")) {
    if (digits.startsWith("0")) digits = digits.slice(1);
    digits = `966${digits}`;
  }
  return digits;
}

/** Pledges whose redemption period ends within the next 15 days (not yet overdue), for the reminder notification bell. */
export async function listReminders(): Promise<ReminderItem[]> {
  const rows = (await sql`
    SELECT p.*, c.full_name AS customer_full_name, c.national_id AS customer_national_id, c.phone AS customer_phone
    FROM pledges p
    JOIN customers c ON c.id = p.customer_id
    WHERE p.status = 'active'
      AND (p.start_date::date + (p.period_days || ' days')::interval)
        BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '15 days')
    ORDER BY (p.start_date::date + (p.period_days || ' days')::interval) ASC
    LIMIT 50
  `) as PledgeWithCustomer[];

  const shopProfile = await getShopProfile();
  const today = todayUtc();

  return rows.map((p) => {
    const computed = computePledge(p, today);
    const message =
      `السلام عليكم\n` +
      `حبينا نذكرك بفاتورتك رقم ${p.contract_number}\n` +
      `الموعد النهائي للسداد بتاريخ ${formatDate(computed.endDate)}\n` +
      shopProfile.name;

    const normalizedPhone = p.customer_phone ? normalizeSaudiPhone(p.customer_phone) : null;
    const whatsappUrl = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
      : null;

    return {
      pledgeId: p.id,
      contractNumber: p.contract_number,
      customerName: p.customer_full_name,
      daysRemaining: computed.daysRemaining,
      isOverdue: computed.isOverdue,
      whatsappUrl,
    };
  });
}

export async function getPledge(id: number): Promise<PledgeWithCustomer | null> {
  const rows = (await sql`
    SELECT p.*, c.full_name AS customer_full_name, c.national_id AS customer_national_id, c.phone AS customer_phone
    FROM pledges p
    JOIN customers c ON c.id = p.customer_id
    WHERE p.id = ${id}
  `) as PledgeWithCustomer[];
  return rows[0] ?? null;
}

export async function listPledgesForCustomer(customerId: number): Promise<Pledge[]> {
  return (await sql`
    SELECT * FROM pledges WHERE customer_id = ${customerId} ORDER BY created_at DESC
  `) as Pledge[];
}

const AUTO_CONTRACT_PREFIX = "H";

/** Next auto-generated invoice number, continuing after the highest existing "H<digits>" number (old free-text invoice numbers are left untouched). */
export async function getNextContractNumber(): Promise<string> {
  const rows = (await sql`
    SELECT MAX((substring(contract_number FROM 2))::int) AS max_n
    FROM pledges WHERE contract_number ~ '^H[0-9]+$'
  `) as { max_n: number | null }[];
  const maxN = rows[0]?.max_n ?? 0;
  return `${AUTO_CONTRACT_PREFIX}${maxN + 1}`;
}

export async function createPledgeFormAction(formData: FormData): Promise<{ error?: string }> {
  const customerMode = String(formData.get("customer_mode") ?? "existing");
  let customer_id = Number(formData.get("customer_id"));

  if (customerMode === "new") {
    const full_name = String(formData.get("new_full_name") ?? "").trim();
    const national_id = String(formData.get("new_national_id") ?? "").trim();
    if (!full_name || !national_id) {
      return { error: "الرجاء تعبئة اسم ورقم هوية العميل الجديد" };
    }
    const existingCustomer = await findCustomerByNationalId(national_id);
    if (existingCustomer) {
      customer_id = existingCustomer.id;
    } else {
      const customer = await createCustomer({
        full_name,
        national_id,
        nationality: String(formData.get("new_nationality") ?? "").trim() || undefined,
        phone: String(formData.get("new_phone") ?? "").trim() || undefined,
        email: String(formData.get("new_email") ?? "").trim() || undefined,
        id_issue_date: String(formData.get("new_id_issue_date") ?? "").trim() || undefined,
        id_issue_place: String(formData.get("new_id_issue_place") ?? "").trim() || undefined,
      });
      customer_id = customer.id;
    }
  }

  if (!customer_id) {
    return { error: "الرجاء اختيار عميل أو إدخال بيانات عميل جديد" };
  }

  const contract_number = String(formData.get("contract_number") ?? "").trim();
  const item_type = String(formData.get("item_type") ?? "").trim();
  const item_description = String(formData.get("item_description") ?? "").trim();
  const weight_grams = String(formData.get("weight_grams") ?? "").trim();
  const reference_number = String(formData.get("reference_number") ?? "").trim();
  const box_number = String(formData.get("box_number") ?? "").trim();
  const family_group = String(formData.get("family_group") ?? "").trim();
  const principal_amount = Number(formData.get("principal_amount"));
  const monthly_rate_percent = Number(formData.get("monthly_rate_percent"));
  const period_days = Number(formData.get("period_days") || 90);
  const start_date = String(formData.get("start_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const customer_signature = String(formData.get("customer_signature") ?? "").trim();
  const item_photo = String(formData.get("item_photo") ?? "").trim();

  if (!customer_id || !contract_number || !item_type || !item_description || !start_date) {
    return { error: "الرجاء تعبئة جميع الحقول المطلوبة" };
  }
  if (!customer_signature.startsWith("data:image/")) {
    return { error: "توقيع البائع (العميل) مطلوب" };
  }
  if (customer_signature.length > 300_000) {
    return { error: "التوقيع كبير جدًا، حاول توقيع أبسط" };
  }
  if (item_photo && !item_photo.startsWith("data:image/")) {
    return { error: "صيغة صورة البضاعة غير صحيحة" };
  }
  if (item_photo.length > 2_000_000) {
    return { error: "حجم صورة البضاعة كبير جدًا" };
  }
  if (!Number.isFinite(principal_amount) || principal_amount <= 0) {
    return { error: "مبلغ الشراء غير صحيح" };
  }
  if (!Number.isFinite(monthly_rate_percent) || monthly_rate_percent < 0) {
    return { error: "نسبة الاسترداد غير صحيحة" };
  }
  if (!Number.isFinite(period_days) || period_days <= 0) {
    return { error: "مدة الاسترداد غير صحيحة" };
  }

  const existing = (await sql`
    SELECT id FROM pledges WHERE contract_number = ${contract_number}
  `) as { id: number }[];
  if (existing.length > 0) {
    return { error: "رقم العقد/الفاتورة مستخدم مسبقًا" };
  }

  const rows = (await sql`
    INSERT INTO pledges (
      contract_number, customer_id, item_type, item_description, weight_grams,
      reference_number, box_number, family_group, principal_amount,
      monthly_rate_percent, period_days, start_date, notes, customer_signature, item_photo
    ) VALUES (
      ${contract_number}, ${customer_id}, ${item_type}, ${item_description},
      ${weight_grams ? Number(weight_grams) : null}, ${reference_number || null},
      ${box_number || null}, ${family_group || null}, ${principal_amount},
      ${monthly_rate_percent}, ${period_days}, ${start_date}, ${notes || null}, ${customer_signature},
      ${item_photo || null}
    )
    RETURNING id
  `) as { id: number }[];

  redirect(`/pledges/${rows[0].id}`);
}

export async function redeemPledgeFormAction(formData: FormData): Promise<{ error?: string }> {
  const pledgeId = Number(formData.get("pledge_id"));
  const receipt_signature = String(formData.get("receipt_signature") ?? "").trim();
  const isOtherReceiver = String(formData.get("is_other_receiver") ?? "") === "true";
  const receiver_full_name = String(formData.get("receiver_full_name") ?? "").trim();
  const receiver_national_id = String(formData.get("receiver_national_id") ?? "").trim();
  const receiver_id_photo = String(formData.get("receiver_id_photo") ?? "").trim();

  if (!pledgeId) {
    return { error: "بيانات غير صحيحة" };
  }
  if (!receipt_signature.startsWith("data:image/")) {
    return { error: "توقيع مستلم القطعة على سند الاستلام مطلوب" };
  }
  if (receipt_signature.length > 300_000) {
    return { error: "التوقيع كبير جدًا، حاول توقيع أبسط" };
  }
  if (isOtherReceiver) {
    if (!receiver_full_name || !receiver_national_id) {
      return { error: "اسم ورقم هوية الشخص المستلم مطلوبان" };
    }
    if (receiver_id_photo && !receiver_id_photo.startsWith("data:image/")) {
      return { error: "صيغة صورة هوية المستلم غير صحيحة" };
    }
    if (receiver_id_photo.length > 2_000_000) {
      return { error: "حجم صورة هوية المستلم كبير جدًا" };
    }
  }

  const pledge = await getPledge(pledgeId);
  if (!pledge || pledge.status !== "active") {
    return { error: "لا يمكن تسجيل إعادة الشراء لهذه الفاتورة" };
  }

  const computed = computePledge(pledge, todayUtc());
  const settlement = Math.round(computed.totalDue * 100) / 100;

  await sql`
    UPDATE pledges
    SET status = 'redeemed', redeemed_at = CURRENT_DATE, settlement_amount = ${settlement},
        receipt_signature = ${receipt_signature},
        receiver_full_name = ${isOtherReceiver ? receiver_full_name : null},
        receiver_national_id = ${isOtherReceiver ? receiver_national_id : null},
        receiver_id_photo = ${isOtherReceiver ? receiver_id_photo || null : null},
        updated_at = now()
    WHERE id = ${pledgeId}
  `;

  redirect(`/pledges/${pledgeId}/receipt`);
}

export async function forfeitPledgeAction(pledgeId: number): Promise<void> {
  await sql`
    UPDATE pledges SET status = 'forfeited', updated_at = now() WHERE id = ${pledgeId} AND status = 'active'
  `;
  redirect(`/pledges/${pledgeId}`);
}

// ---------- Contact log ----------

export async function listContactLogsForPledge(pledgeId: number): Promise<ContactLogWithPledge[]> {
  return (await sql`
    SELECT cl.*, p.contract_number AS pledge_contract_number
    FROM contact_logs cl
    LEFT JOIN pledges p ON p.id = cl.pledge_id
    WHERE cl.pledge_id = ${pledgeId}
    ORDER BY cl.contacted_at DESC
  `) as ContactLogWithPledge[];
}

export async function createContactLogAction(formData: FormData): Promise<{ error?: string }> {
  const customer_id = Number(formData.get("customer_id"));
  const pledgeIdRaw = String(formData.get("pledge_id") ?? "").trim();
  const pledge_id = pledgeIdRaw ? Number(pledgeIdRaw) : null;
  const contact_method = String(formData.get("contact_method") ?? "").trim() as ContactMethod;
  const notes = String(formData.get("notes") ?? "").trim();
  const contactedAtRaw = String(formData.get("contacted_at") ?? "").trim();
  const attachment = String(formData.get("attachment") ?? "").trim();

  if (!customer_id) {
    return { error: "عميل غير صحيح" };
  }
  if (!CONTACT_METHODS.includes(contact_method)) {
    return { error: "طريقة التواصل غير صحيحة" };
  }
  if (!notes && !attachment) {
    return { error: "أضف ملاحظة أو أرفق صورة على الأقل" };
  }
  if (attachment && !attachment.startsWith("data:image/")) {
    return { error: "صيغة المرفق غير صحيحة" };
  }
  if (attachment.length > 2_000_000) {
    return { error: "حجم الصورة كبير جدًا" };
  }

  const contactedAt = contactedAtRaw ? new Date(contactedAtRaw) : new Date();
  if (Number.isNaN(contactedAt.getTime())) {
    return { error: "تاريخ التواصل غير صحيح" };
  }

  await sql`
    INSERT INTO contact_logs (customer_id, pledge_id, contact_method, notes, attachment, contacted_at)
    VALUES (${customer_id}, ${pledge_id}, ${contact_method}, ${notes || null}, ${attachment || null}, ${contactedAt.toISOString()})
  `;

  if (pledge_id) redirect(`/pledges/${pledge_id}`);
  redirect(`/customers/${customer_id}`);
}

// ---------- Shop profile ----------

export async function getShopProfile(): Promise<ShopProfile> {
  const rows = (await sql`SELECT * FROM shop_profile WHERE id = 1`) as ShopProfile[];
  return (
    rows[0] ?? {
      id: 1,
      name: "مجوهرات هاني النمر",
      commercial_registration: null,
      phone: null,
      address: null,
      signature: null,
      stamp: null,
      updated_at: new Date().toISOString(),
    }
  );
}

export async function updateShopProfileFormAction(formData: FormData): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const commercial_registration = String(formData.get("commercial_registration") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const signature = String(formData.get("signature") ?? "").trim();
  const stamp = String(formData.get("stamp") ?? "").trim();

  if (!name) {
    return { error: "اسم المحل مطلوب" };
  }
  if (signature && !signature.startsWith("data:image/")) {
    return { error: "صيغة توقيع المحل غير صحيحة" };
  }
  if (signature.length > 2_000_000) {
    return { error: "حجم صورة توقيع المحل كبير جدًا" };
  }
  if (stamp && !stamp.startsWith("data:image/")) {
    return { error: "صيغة ختم المحل غير صحيحة" };
  }
  if (stamp.length > 2_000_000) {
    return { error: "حجم صورة ختم المحل كبير جدًا" };
  }

  await sql`
    INSERT INTO shop_profile (id, name, commercial_registration, phone, address, signature, stamp, updated_at)
    VALUES (1, ${name}, ${commercial_registration || null}, ${phone || null}, ${address || null},
      ${signature || null}, ${stamp || null}, now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      commercial_registration = EXCLUDED.commercial_registration,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      signature = EXCLUDED.signature,
      stamp = EXCLUDED.stamp,
      updated_at = now()
  `;

  redirect("/profile");
}
