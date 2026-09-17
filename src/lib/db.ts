import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | undefined;

function getSql(): NeonQueryFunction<false, false> {
  if (!cached) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    cached = neon(process.env.DATABASE_URL);
  }
  return cached;
}

// Lazy so importing this module (e.g. during Next.js build-time page-data
// collection) doesn't require DATABASE_URL to already be set.
export const sql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
    },
    get(_target, prop) {
      return Reflect.get(getSql(), prop);
    },
  }
);

// Note: the Neon driver parses Postgres DATE/TIMESTAMPTZ columns into native
// Date objects, not strings — these fields must be handled as `string | Date`.
export type Customer = {
  id: number;
  full_name: string;
  national_id: string;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  id_issue_date: string | Date | null;
  id_issue_place: string | null;
  created_at: string | Date;
};

export type PledgeStatus = "active" | "redeemed" | "forfeited";

export type Pledge = {
  id: number;
  contract_number: string;
  customer_id: number;
  item_type: string;
  item_description: string;
  weight_grams: string | null;
  reference_number: string | null;
  box_number: string | null;
  family_group: string | null;
  principal_amount: string;
  monthly_rate_percent: string;
  period_days: number;
  start_date: string | Date;
  status: PledgeStatus;
  redeemed_at: string | Date | null;
  settlement_amount: string | null;
  notes: string | null;
  customer_signature: string | null;
  receipt_signature: string | null;
  id_photo: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export type PledgeWithCustomer = Pledge & {
  customer_full_name: string;
  customer_national_id: string;
  customer_phone: string | null;
};

export type ContactMethod = "phone" | "whatsapp" | "sms" | "in_person" | "other";

export type ContactLog = {
  id: number;
  customer_id: number;
  pledge_id: number | null;
  contact_method: ContactMethod;
  notes: string | null;
  attachment: string | null;
  contacted_at: string | Date;
  created_at: string | Date;
};

export type ContactLogWithPledge = ContactLog & {
  pledge_contract_number: string | null;
};
