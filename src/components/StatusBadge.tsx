import type { PledgeComputed } from "@/lib/pledge-calc";

const STYLES: Record<PledgeComputed["effectiveStatus"], string> = {
  active: "bg-emerald-100 text-emerald-800",
  due_soon: "bg-amber-100 text-amber-800",
  overdue: "bg-orange-100 text-orange-800",
  forfeited: "bg-red-100 text-red-800",
  redeemed: "bg-slate-200 text-slate-700",
};

const LABELS: Record<PledgeComputed["effectiveStatus"], string> = {
  active: "نشط",
  due_soon: "يقترب انتهاء الاسترداد",
  overdue: "متأخرة",
  forfeited: "ملك المحل",
  redeemed: "تم الاسترداد",
};

// Shorter wording for tight spaces (e.g. the dense pledges table on small screens).
const SHORT_LABELS: Record<PledgeComputed["effectiveStatus"], string> = {
  active: "نشط",
  due_soon: "قريب الانتهاء",
  overdue: "متأخرة",
  forfeited: "ملك المحل",
  redeemed: "مسترد",
};

export default function StatusBadge({
  status,
  compact = false,
}: {
  status: PledgeComputed["effectiveStatus"];
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {compact ? SHORT_LABELS[status] : LABELS[status]}
    </span>
  );
}
