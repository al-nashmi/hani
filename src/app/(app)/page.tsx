import Link from "next/link";
import { listPledges } from "@/lib/actions";
import { computePledge, formatDate, formatSAR, todayUtc } from "@/lib/pledge-calc";
import StatusBadge from "@/components/StatusBadge";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشط" },
  { key: "due_soon", label: "يقترب الاستحقاق" },
  { key: "forfeited", label: "آلت للمحل" },
  { key: "redeemed", label: "مسترجعة" },
] as const;

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const filter = typeof params.status === "string" ? params.status : "all";

  const pledges = await listPledges({ search });
  const today = todayUtc();
  const rows = pledges.map((p) => ({ pledge: p, computed: computePledge(p, today) }));
  const filtered =
    filter === "all" ? rows : rows.filter((r) => r.computed.effectiveStatus === filter);

  const totals = {
    activeCount: rows.filter((r) => r.computed.effectiveStatus === "active" || r.computed.effectiveStatus === "due_soon").length,
    principalOutstanding: rows
      .filter((r) => r.pledge.status === "active")
      .reduce((sum, r) => sum + Number(r.pledge.principal_amount), 0),
    dueOutstanding: rows
      .filter((r) => r.pledge.status === "active")
      .reduce((sum, r) => sum + r.computed.totalDue, 0),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">عدد الرهونات النشطة</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{totals.activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">إجمالي المبالغ الأصلية القائمة</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(totals.principalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">إجمالي المستحق اليوم (بالفائدة)</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(totals.dueOutstanding)}</p>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="بحث بالاسم / رقم الهوية / رقم العقد"
          className="w-72 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        <input type="hidden" name="status" value={filter} />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          بحث
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/?status=${f.key}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.key ? "bg-teal-700 text-white" : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-semibold">رقم العقد</th>
              <th className="px-3 py-2 text-right font-semibold">العميل</th>
              <th className="px-3 py-2 text-right font-semibold">القطعة</th>
              <th className="px-3 py-2 text-right font-semibold">المبلغ الأصلي</th>
              <th className="px-3 py-2 text-right font-semibold">تاريخ البدء</th>
              <th className="px-3 py-2 text-right font-semibold">أيام مستهلكة</th>
              <th className="px-3 py-2 text-right font-semibold">أيام متبقية</th>
              <th className="px-3 py-2 text-right font-semibold">المستحق اليوم</th>
              <th className="px-3 py-2 text-right font-semibold">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ pledge, computed }) => (
              <tr key={pledge.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link href={`/pledges/${pledge.id}`} className="font-medium text-teal-700 hover:underline">
                    {pledge.contract_number}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/customers/${pledge.customer_id}`} className="hover:underline">
                    {pledge.customer_full_name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-600">{pledge.item_type}</td>
                <td className="px-3 py-2">{formatSAR(Number(pledge.principal_amount))}</td>
                <td className="px-3 py-2 text-slate-600">{formatDate(pledge.start_date)}</td>
                <td className="px-3 py-2">{computed.daysElapsed}</td>
                <td className="px-3 py-2">{computed.daysRemaining}</td>
                <td className="px-3 py-2 font-medium">{formatSAR(computed.totalDue)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={computed.effectiveStatus} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                  لا توجد رهونات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
