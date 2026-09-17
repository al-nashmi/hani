import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, listPledgesForCustomer } from "@/lib/actions";
import { computePledge, formatDate, formatSAR, todayUtc } from "@/lib/pledge-calc";
import StatusBadge from "@/components/StatusBadge";

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
        <Link
          href={`/pledges/new?customer_id=${customer.id}`}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          + رهن جديد لهذا العميل
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <Info label="رقم الهوية" value={customer.national_id} />
        <Info label="الجنسية" value={customer.nationality || "-"} />
        <Info label="الجوال" value={customer.phone || "-"} />
        <Info label="البريد الإلكتروني" value={customer.email || "-"} />
        <Info label="تاريخ إصدار الهوية" value={customer.id_issue_date ? formatDate(customer.id_issue_date) : "-"} />
        <Info label="مصدر الهوية" value={customer.id_issue_place || "-"} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">سجل الرهونات</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right font-semibold">رقم العقد</th>
                <th className="px-3 py-2 text-right font-semibold">القطعة</th>
                <th className="px-3 py-2 text-right font-semibold">المبلغ الأصلي</th>
                <th className="px-3 py-2 text-right font-semibold">تاريخ البدء</th>
                <th className="px-3 py-2 text-right font-semibold">المستحق اليوم</th>
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
                    لا يوجد رهونات لهذا العميل
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
