import { updateWatchLeadStatusAction } from "@/lib/actions";
import { formatDateTime, formatSAR } from "@/lib/pledge-calc";
import type { WatchLeadWithImages } from "@/lib/db";

const STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  dismissed: "تم التجاهل",
};

export default function LeadCard({ lead, kind }: { lead: WatchLeadWithImages; kind: "for_sale" | "wanted" }) {
  const priceText =
    lead.price != null
      ? `${formatSAR(Number(lead.price))}${lead.price_type === "offer" ? " (سوم)" : ""}`
      : lead.price_type === "offer"
        ? "سوم (بدون سعر محدد)"
        : "غير محدد";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
      {lead.images.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Haraj-hosted image URL, not an optimizable local asset
        <img
          src={lead.images[0]}
          alt=""
          className="h-32 w-full rounded-lg object-cover sm:h-24 sm:w-24 sm:shrink-0"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400 sm:h-24 sm:w-24 sm:shrink-0">
          لا توجد صورة
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <a
          href={lead.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="block truncate font-semibold text-teal-700 hover:underline"
        >
          {lead.title}
        </a>
        <p className="text-sm text-slate-600">
          {lead.brand ? `${lead.brand} · ` : ""}
          {priceText}
          {lead.city ? ` · ${lead.city}` : ""}
        </p>
        {lead.description && <p className="line-clamp-2 text-xs text-slate-500">{lead.description}</p>}
        <p className="text-xs text-slate-400">أُضيف: {formatDateTime(lead.first_seen_at)}</p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              lead.status === "new"
                ? "bg-amber-100 text-amber-800"
                : lead.status === "contacted"
                  ? "bg-teal-100 text-teal-800"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {STATUS_LABEL[lead.status]}
          </span>
          {lead.status !== "contacted" && (
            <form action={updateWatchLeadStatusAction}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="status" value="contacted" />
              <button className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
                تم التواصل
              </button>
            </form>
          )}
          {lead.status !== "dismissed" && (
            <form action={updateWatchLeadStatusAction}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="status" value="dismissed" />
              <button className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
                تجاهل
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
