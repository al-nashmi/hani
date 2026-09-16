import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(process.env.DATABASE_URL);

export type Customer = {
  id: number;
  full_name: string;
  national_id: string;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  id_issue_date: string | null;
  id_issue_place: string | null;
  created_at: string;
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
  start_date: string;
  status: PledgeStatus;
  redeemed_at: string | null;
  settlement_amount: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PledgeWithCustomer = Pledge & {
  customer_full_name: string;
  customer_national_id: string;
  customer_phone: string | null;
};
