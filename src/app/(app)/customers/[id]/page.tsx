import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, listPledgesForCustomer } from "@/lib/actions";
import { computePledge, formatDate, formatSAR, todayUtc } from "@/lib/pledge-calc";
import StatusBadge from "@/components/StatusBadge";
import CardField from "@/components/CardField";

export default async function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const customer = await getCustomer(Number(id));
  if (!customer) notFound();

  const pledges = await listPledgesForCustomer(customer.id);
  const today = todayUtc();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">{customer.full_name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/customers/${customer.id}/edit`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            تعديل بيانات العميل
          </Link>
          <Link
            href={`/pledges/new?customer_id=${customer.id}`}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            + شراء جديد من هذا العميل
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <Info label="رقم الهوية" value={customer.national_id || "-"} />
        <Info label="الجنسية" value={customer.nationality || "-"} />
        <Info label="الجوال" value={customer.phone || "-"} />
        <Info label="البريد الإلكتروني" value={customer.email || "-"} />
        <Info label="تاريخ إصدار الهوية" value={customer.id_issue_date ? formatDate(customer.id_issue_date) : "-"} />
        <Info label="مصدر الهوية" value={customer.id_issue_place || "-"} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">سجل المشتريات</h2>

        {/* Card list on phones/tablets so nothing needs horizontal scrolling; real table from lg up. */}
        <div className="space-y-3 lg:hidden">
          {pledges.map((p) => {
            const computed = computePledge(p, today);
            return (
              <Link
                key={p.id}
                href={`/pledges/${p.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-teal-700">{p.contract_number}</span>
                  <StatusBadge status={computed.effectiveStatus} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                  <CardField label="القطعة" value={p.item_type} />
                  <CardField label="مبلغ الشراء" value={formatSAR(Number(p.principal_amount))} />
                  <CardField label="تاريخ الشراء" value={formatDate(p.start_date)} />
                  <CardField label="مبلغ الاسترداد اليوم" value={formatSAR(computed.totalDue)} />
                </div>
              </Link>
            );
          })}
          {pledges.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              لا يوجد مشتريات لهذا العميل
            </p>
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">رقم الفاتورة</th>
                <th className="px-3 py-2 text-right font-semibold">القطعة</th>
                <th className="px-3 py-2 text-right font-semibold">مبلغ الشراء</th>
                <th className="px-3 py-2 text-right font-semibold">تاريخ الشراء</th>
                <th className="px-3 py-2 text-right font-semibold">مبلغ الاسترداد اليوم</th>
                <th className="px-3 py-2 text-right font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {pledges.map((p) => {
                const computed = computePledge(p, today);
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link href={`/pledges/${p.id}`} className="font-medium text-teal-700 hover:underline">
                        {p.contract_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{p.item_type}</td>
                    <td className="px-3 py-2">{formatSAR(Number(p.principal_amount))}</td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(p.start_date)}</td>
                    <td className="px-3 py-2 font-medium">{formatSAR(computed.totalDue)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={computed.effectiveStatus} />
                    </td>
                  </tr>
                );
              })}
              {pledges.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    لا يوجد مشتريات لهذا العميل
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  );
}
