import { listWatchLeads, runManualScanAction } from "@/lib/actions";
import OpportunitiesTabs from "../OpportunitiesTabs";
import LeadCard from "../LeadCard";

export const dynamic = "force-dynamic";

export default async function ForSalePage({ searchParams }: PageProps<"/opportunities/for-sale">) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const leads = await listWatchLeads("for_sale", status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">الباحث عن الفرص — فرص شراء</h1>
        <form action={runManualScanAction}>
          <input type="hidden" name="kind" value="for_sale" />
          <button className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
            تحديث الآن
          </button>
        </form>
      </div>

      <p className="text-sm text-slate-500">
        إعلانات بيع ساعات ثمينة من حراج، تُجمع تلقائيًا يوميًا حسب اسم الماركة. تواصل مع صاحب الإعلان عبر رابط حراج مباشرة.
      </p>

      <OpportunitiesTabs active="for_sale" />

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { key: undefined, label: "الكل" },
          { key: "new", label: "جديد" },
          { key: "contacted", label: "تم التواصل" },
          { key: "dismissed", label: "تم التجاهل" },
        ].map((f) => (
          <a
            key={f.label}
            href={f.key ? `/opportunities/for-sale?status=${f.key}` : "/opportunities/for-sale"}
            className={`rounded-lg px-3 py-1.5 ${
              status === f.key ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} kind="for_sale" />
        ))}
        {leads.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            لا توجد فرص حاليًا
          </p>
        )}
      </div>
    </div>
  );
}
