import type { Pledge, PledgeWithCustomer } from "./db";
import { computePledge, todayUtc } from "./pledge-calc";

export type PledgeReport = {
  pledgeId: number;
  contractNumber: string;
  itemType: string;
  status: string;
  invested: number;
  profit: number;
  roi: number;
};

export type CustomerReportRow = {
  customerId: number;
  customerFullName: string;
  customerNationalId: string;
  pledgeCount: number;
  invested: number;
  profit: number;
  roi: number;
};

/**
 * Profit per pledge is cash-realized only: the accrued/settled fee.
 * A forfeited pledge counts 0 profit here (no cash changed hands) even
 * though the shop keeps an item worth more than the principal.
 */
export function computePledgeProfit(pledge: Pledge, asOf: Date = todayUtc()): number {
  if (pledge.status === "redeemed") {
    return Number(pledge.settlement_amount) - Number(pledge.principal_amount);
  }
  if (pledge.status === "forfeited") {
    return 0;
  }
  return computePledge(pledge, asOf).feeAccrued;
}

export function computePledgeReports(pledges: Pledge[], asOf: Date = todayUtc()): PledgeReport[] {
  return pledges.map((p) => {
    const invested = Number(p.principal_amount);
    const profit = computePledgeProfit(p, asOf);
    return {
      pledgeId: p.id,
      contractNumber: p.contract_number,
      itemType: p.item_type,
      status: p.status,
      invested,
      profit,
      roi: invested > 0 ? (profit / invested) * 100 : 0,
    };
  });
}

export function computeCustomerReports(
  pledges: PledgeWithCustomer[],
  asOf: Date = todayUtc()
): CustomerReportRow[] {
  const byCustomer = new Map<number, CustomerReportRow>();

  for (const p of pledges) {
    const invested = Number(p.principal_amount);
    const profit = computePledgeProfit(p, asOf);
    const existing = byCustomer.get(p.customer_id);
    if (existing) {
      existing.pledgeCount += 1;
      existing.invested += invested;
      existing.profit += profit;
    } else {
      byCustomer.set(p.customer_id, {
        customerId: p.customer_id,
        customerFullName: p.customer_full_name,
        customerNationalId: p.customer_national_id,
        pledgeCount: 1,
        invested,
        profit,
        roi: 0,
      });
    }
  }

  const rows = Array.from(byCustomer.values());
  for (const row of rows) {
    row.roi = row.invested > 0 ? (row.profit / row.invested) * 100 : 0;
  }
  return rows.sort((a, b) => b.profit - a.profit);
}

export function computeTotals(rows: { invested: number; profit: number }[]) {
  const invested = rows.reduce((sum, r) => sum + r.invested, 0);
  const profit = rows.reduce((sum, r) => sum + r.profit, 0);
  return { invested, profit, roi: invested > 0 ? (profit / invested) * 100 : 0 };
}
