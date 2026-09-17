import type { PledgeComputed } from "@/lib/pledge-calc";

const STYLES: Record<PledgeComputed["effectiveStatus"], string> = {
  active: "bg-emerald-100 text-emerald-800",
  due_soon: "bg-amber-100 text-amber-800",
  forfeited: "bg-red-100 text-red-800",
  redeemed: "bg-slate-200 text-slate-700",
};

const LABELS: Record<PledgeComputed["effectiveStatus"], string> = {
  active: "نشط",
  due_soon: "يقترب انتهاء الاسترداد",
  forfeited: "ملك المحل",
  redeemed: "تم الاسترداد",
};

export default function StatusBadge({ status }: { status: PledgeComputed["effectiveStatus"] }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
