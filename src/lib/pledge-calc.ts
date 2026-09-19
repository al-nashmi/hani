import type { Pledge } from "./db";

export const ITEM_TYPES = ["ذهب", "مجوهرات", "ساعة", "أخرى"] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The Neon driver parses Postgres DATE/TIMESTAMPTZ columns into native Date
// objects (not strings), even though our types say `string` for simplicity.
export function toUtcDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export type PledgeComputed = {
  startDate: Date;
  endDate: Date;
  daysElapsedRaw: number;
  daysElapsed: number;
  daysRemaining: number;
  feeAccrued: number;
  totalDue: number;
  effectiveStatus: "active" | "redeemed" | "forfeited" | "due_soon" | "overdue";
  isOverdue: boolean;
};

/** نسبة شهرية ثابتة على المبلغ الأصلي، تُحسب بالتناسب اليومي (شهر = 30 يوم) */
export function computePledge(pledge: Pledge, asOf: Date = todayUtc()): PledgeComputed {
  const startDate = toUtcDate(pledge.start_date);
  const endDate = addDays(startDate, pledge.period_days);
  const principal = Number(pledge.principal_amount);
  const rate = Number(pledge.monthly_rate_percent);

  const daysElapsedRaw = Math.max(0, daysBetween(startDate, asOf));
  const daysElapsed = Math.min(daysElapsedRaw, pledge.period_days);
  const daysRemaining = Math.max(0, pledge.period_days - daysElapsedRaw);

  const feeAccrued = principal * (rate / 100) * (daysElapsed / 30);
  const totalDue = principal + feeAccrued;

  const isOverdue = pledge.status === "active" && daysElapsedRaw >= pledge.period_days;

  // Going overdue never auto-forfeits the pledge — the item only becomes the
  // shop's property once the owner explicitly confirms it (forfeitPledgeAction).
  let effectiveStatus: PledgeComputed["effectiveStatus"];
  if (pledge.status === "redeemed") effectiveStatus = "redeemed";
  else if (pledge.status === "forfeited") effectiveStatus = "forfeited";
  else if (isOverdue) effectiveStatus = "overdue";
  else if (daysRemaining <= 7) effectiveStatus = "due_soon";
  else effectiveStatus = "active";

  return {
    startDate,
    endDate,
    daysElapsedRaw,
    daysElapsed,
    daysRemaining,
    feeAccrued,
    totalDue,
    effectiveStatus,
    isOverdue,
  };
}

export function formatSAR(amount: number): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Normalizes a DB date/timestamp value (string or Date) to "YYYY-MM-DD". */
export function toISODateString(value: string | Date | null): string {
  if (value === null) return "";
  return toUtcDate(value).toISOString().slice(0, 10);
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toUtcDate(value));
}

/** For real timestamps (contact log, created_at) where the time of day matters. */
export function formatDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
