import Link from "next/link";
import { listPledgesPage, type PledgeSortKey, type PledgeStatusFilter } from "@/lib/actions";
import { computePledge, formatSAR, todayUtc } from "@/lib/pledge-calc";
import PledgesTable from "@/components/PledgesTable";

const FILTERS: { key: PledgeStatusFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشط" },
  { key: "due_soon", label: "يقترب انتهاء الاسترداد" },
  { key: "overdue", label: "متأخرة" },
  { key: "forfeited", label: "ملك المحل" },
  { key: "redeemed", label: "تم الاسترداد" },
];

const SORT_KEYS: PledgeSortKey[] = [
  "contract_number",
  "customer_full_name",
  "item_type",
  "principal_amount",
  "start_date",
  "days_remaining",
  "total_due",
];

const PAGE_SIZE = 50;

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const filter = (typeof params.status === "string" ? params.status : "all") as PledgeStatusFilter;
  const hasSortParam = typeof params.sort === "string";
  const sortKey = (
    hasSortParam && SORT_KEYS.includes(params.sort as PledgeSortKey) ? params.sort : "start_date"
  ) as PledgeSortKey;
  const sortDir = params.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.page) || 1);

  const result = await listPledgesPage({
    search,
    status: filter,
    sortKey,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });
  const today = todayUtc();
  const rows = result.rows.map((p) => ({ pledge: p, computed: computePledge(p, today) }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">عدد المشتريات النشطة</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{result.activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">إجمالي مبالغ الشراء القائمة</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(result.principalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">إجمالي مبلغ الاسترداد اليوم</p>
          <p className="mt-1 text-2xl font-bold text-teal-800">{formatSAR(result.dueOutstanding)}</p>
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
        <input type="hidden" name="sort" value={sortKey} />
        <input type="hidden" name="dir" value={sortDir} />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          بحث
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const qs = new URLSearchParams();
          qs.set("status", f.key);
          if (search) qs.set("q", search);
          qs.set("sort", sortKey);
          qs.set("dir", sortDir);
          return (
            <Link
              key={f.key}
              href={`/?${qs.toString()}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                filter === f.key ? "bg-teal-700 text-white" : "bg-white text-slate-700 border border-slate-300"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <PledgesTable
        rows={rows}
        totalCount={result.total}
        page={page}
        pageSize={PAGE_SIZE}
        sortKey={sortKey}
        sortDir={sortDir}
        hasSortParam={hasSortParam}
        baseParams={{ q: search, status: filter }}
      />
    </div>
  );
}
