import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, listPledgesForCustomer } from "@/lib/actions";
import { computePledgeReports, computeTotals } from "@/lib/reports";
import { computePledge, formatSAR, todayUtc } from "@/lib/pledge-calc";
import StatusBadge from "@/components/StatusBadge";
import CardField from "@/components/CardField";
import CustomerReportChart from "./CustomerReportChart";

export default async function CustomerReportPage({ params }: PageProps<"/reports/customers/[id]">) {
  const { id } = await params;
  const customer = await getCustomer(Number(id));
  if (!customer) notFound();

  const pledges = await listPledgesForCustomer(customer.id);
  const today = todayUtc();
  const pledgeReports = computePledgeReports(pledges, today);
  const totals = computeTotals(pledgeReports);

  const chartData = pledgeReports.map((r) => ({
    contractNumber: r.contractNumber,
    invested: r.invested,
    profit: r.profit,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm text-teal-700 hover:underline">
          ← رجوع للتقارير
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-800">{customer.full_name}</h1>
        <p className="text-sm text-slate-500">{customer.national_id}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">المبلغ المستثمر</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(totals.invested)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">الأرباح</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(totals.profit)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">العائد على الاستثمار</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{totals.roi.toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-800">المستثمر مقابل الأرباح لكل فاتورة</h2>
        {chartData.length > 0 ? (
          <CustomerReportChart data={chartData} />
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">لا توجد مشتريات لهذا العميل</p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">تفاصيل المشتريات</h2>

        {/* Card list on phones/tablets so nothing needs horizontal scrolling; real table from lg up. */}
        <div className="space-y-3 lg:hidden">
          {pledges.map((p) => {
            const report = pledgeReports.find((r) => r.pledgeId === p.id)!;
            const status = computePledge(p, today).effectiveStatus;
            return (
              <Link
                key={p.id}
                href={`/pledges/${p.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-teal-700">{p.contract_number}</span>
                  <StatusBadge status={status} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                  <CardField label="القطعة" value={p.item_type} />
                  <CardField label="المبلغ المستثمر" value={formatSAR(report.invested)} />
                  <CardField label="الأرباح" value={formatSAR(report.profit)} />
                  <CardField label="العائد على الاستثمار" value={`${report.roi.toFixed(1)}%`} />
                </div>
              </Link>
            );
          })}
          {pledges.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              لا توجد مشتريات
            </p>
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">رقم الفاتورة</th>
                <th className="px-3 py-2 text-right font-semibold">القطعة</th>
                <th className="px-3 py-2 text-right font-semibold">المبلغ المستثمر</th>
                <th className="px-3 py-2 text-right font-semibold">الأرباح</th>
                <th className="px-3 py-2 text-right font-semibold">العائد على الاستثمار</th>
                <th className="px-3 py-2 text-right font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {pledges.map((p) => {
                const report = pledgeReports.find((r) => r.pledgeId === p.id)!;
                const status = computePledge(p, today).effectiveStatus;
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link href={`/pledges/${p.id}`} className="font-medium text-teal-700 hover:underline">
                        {p.contract_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{p.item_type}</td>
                    <td className="px-3 py-2">{formatSAR(report.invested)}</td>
                    <td className="px-3 py-2 font-medium">{formatSAR(report.profit)}</td>
                    <td className="px-3 py-2">{report.roi.toFixed(1)}%</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
              {pledges.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    لا توجد مشتريات
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
