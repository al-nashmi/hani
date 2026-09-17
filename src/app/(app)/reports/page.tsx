import Link from "next/link";
import { listPledges } from "@/lib/actions";
import { computeCustomerReports, computeTotals, isWithinRange, resolveReportRange } from "@/lib/reports";
import { computePledge, formatSAR, todayUtc } from "@/lib/pledge-calc";
import { StatusDistributionChart, TopCustomersChart, type StatusDatum } from "./ReportsCharts";
import ReportPeriodFilter from "./ReportPeriodFilter";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = await searchParams;
  const today = todayUtc();
  const getParam = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");

  const range = resolveReportRange(
    { period: getParam("period"), month: getParam("month"), year: getParam("year"), from: getParam("from"), to: getParam("to") },
    today
  );

  const allPledges = await listPledges({});
  const pledges = allPledges.filter((p) => isWithinRange(p.start_date, range));

  const customerRows = computeCustomerReports(pledges, today);
  const totals = computeTotals(customerRows);

  const statusCounts = new Map<string, number>();
  for (const p of pledges) {
    const status = computePledge(p, today).effectiveStatus;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }
  const statusData: StatusDatum[] = ["active", "due_soon", "overdue", "forfeited", "redeemed"]
    .map((status) => ({ status, count: statusCounts.get(status) ?? 0 }))
    .filter((d) => d.count > 0);

  const topCustomers = customerRows.slice(0, 10).map((r) => ({
    customerId: r.customerId,
    name: r.customerFullName,
    invested: r.invested,
    profit: r.profit,
    roi: r.roi,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-800">التقارير</h1>
        <span className="text-sm text-slate-500">الفترة المعروضة: {range.label}</span>
      </div>

      <ReportPeriodFilter
        initialPeriod={range.period}
        initialMonth={getParam("month") || `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`}
        initialYear={getParam("year") || String(today.getUTCFullYear())}
        initialFrom={getParam("from")}
        initialTo={getParam("to")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">إجمالي المبالغ المستثمرة</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(totals.invested)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">إجمالي الأرباح</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(totals.profit)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">العائد على الاستثمار</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{totals.roi.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-slate-800">الأعلى ربحًا (أعلى 10 عملاء)</h2>
          <p className="mb-3 text-xs text-slate-500">اضغط على أي عمود لعرض تفاصيل العميل</p>
          {topCustomers.length > 0 ? (
            <TopCustomersChart data={topCustomers} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">لا توجد بيانات كافية</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-800">توزيع المشتريات حسب الحالة</h2>
          {statusData.length > 0 ? (
            <StatusDistributionChart data={statusData} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">لا توجد بيانات كافية</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">تفاصيل العملاء</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">العميل</th>
                <th className="px-3 py-2 text-right font-semibold">عدد المشتريات</th>
                <th className="px-3 py-2 text-right font-semibold">المبلغ المستثمر</th>
                <th className="px-3 py-2 text-right font-semibold">الأرباح</th>
                <th className="px-3 py-2 text-right font-semibold">العائد على الاستثمار</th>
              </tr>
            </thead>
            <tbody>
              {customerRows.map((r) => (
                <tr key={r.customerId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link
                      href={`/reports/customers/${r.customerId}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {r.customerFullName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.pledgeCount}</td>
                  <td className="px-3 py-2">{formatSAR(r.invested)}</td>
                  <td className="px-3 py-2 font-medium">{formatSAR(r.profit)}</td>
                  <td className="px-3 py-2">{r.roi.toFixed(1)}%</td>
                </tr>
              ))}
              {customerRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    لا توجد بيانات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
