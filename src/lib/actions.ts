"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql, type Customer, type Pledge, type PledgeWithCustomer } from "./db";
import { checkPassword, createSessionToken, SESSION_COOKIE } from "./auth";
import { computePledge, todayUtc } from "./pledge-calc";

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
    LIMIT 1000
  `) as PledgeWithCustomer[];
  return rows;
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
    SELECT contract_number FROM pledges WHERE contract_number ~ '^H[0-9]+$'
  `) as { contract_number: string }[];
  const maxN = rows.reduce((max, r) => {
    const n = Number(r.contract_number.slice(1));
    return n > max ? n : max;
  }, 0);
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

  if (!customer_id || !contract_number || !item_type || !item_description || !start_date) {
    return { error: "الرجاء تعبئة جميع الحقول المطلوبة" };
  }
  if (!customer_signature.startsWith("data:image/")) {
    return { error: "توقيع العميل مطلوب" };
  }
  if (customer_signature.length > 300_000) {
    return { error: "توقيع العميل كبير جدًا، حاول توقيع أبسط" };
  }
  if (!Number.isFinite(principal_amount) || principal_amount <= 0) {
    return { error: "مبلغ الرهن غير صحيح" };
  }
  if (!Number.isFinite(monthly_rate_percent) || monthly_rate_percent < 0) {
    return { error: "نسبة الرهن غير صحيحة" };
  }
  if (!Number.isFinite(period_days) || period_days <= 0) {
    return { error: "مدة الرهن غير صحيحة" };
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
      monthly_rate_percent, period_days, start_date, notes, customer_signature
    ) VALUES (
      ${contract_number}, ${customer_id}, ${item_type}, ${item_description},
      ${weight_grams ? Number(weight_grams) : null}, ${reference_number || null},
      ${box_number || null}, ${family_group || null}, ${principal_amount},
      ${monthly_rate_percent}, ${period_days}, ${start_date}, ${notes || null}, ${customer_signature}
    )
    RETURNING id
  `) as { id: number }[];

  redirect(`/pledges/${rows[0].id}`);
}

export async function redeemPledgeAction(pledgeId: number): Promise<void> {
  const pledge = await getPledge(pledgeId);
  if (!pledge || pledge.status !== "active") return;
  const computed = computePledge(pledge, todayUtc());
  const settlement = Math.round(computed.totalDue * 100) / 100;
  await sql`
    UPDATE pledges
    SET status = 'redeemed', redeemed_at = CURRENT_DATE, settlement_amount = ${settlement}, updated_at = now()
    WHERE id = ${pledgeId}
  `;
  redirect(`/pledges/${pledgeId}`);
}

export async function forfeitPledgeAction(pledgeId: number): Promise<void> {
  await sql`
    UPDATE pledges SET status = 'forfeited', updated_at = now() WHERE id = ${pledgeId} AND status = 'active'
  `;
  redirect(`/pledges/${pledgeId}`);
}
