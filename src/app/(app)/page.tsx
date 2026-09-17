import Link from "next/link";
import { listPledges } from "@/lib/actions";
import { computePledge, formatSAR, todayUtc } from "@/lib/pledge-calc";
import PledgesTable from "@/components/PledgesTable";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشط" },
  { key: "due_soon", label: "يقترب انتهاء الاسترداد" },
  { key: "forfeited", label: "ملك المحل" },
  { key: "redeemed", label: "تم الاسترداد" },
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
          <p className="text-sm text-slate-500">عدد المشتريات النشطة</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{totals.activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">إجمالي مبالغ الشراء القائمة</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(totals.principalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">إجمالي مبلغ الاسترداد اليوم</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(totals.dueOutstanding)}</p>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="بحث بالاسم / رقم الهوية / رقم الفاتورة"
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

      <PledgesTable rows={filtered} />
    </div>
  );
}
