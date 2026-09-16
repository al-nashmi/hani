import type { Pledge } from "./db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
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
  effectiveStatus: "active" | "redeemed" | "forfeited" | "due_soon";
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

  let effectiveStatus: PledgeComputed["effectiveStatus"];
  if (pledge.status === "redeemed") effectiveStatus = "redeemed";
  else if (pledge.status === "forfeited" || isOverdue) effectiveStatus = "forfeited";
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

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toUtcDate(dateStr));
}
