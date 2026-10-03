"use client";

import { deletePledgeAction } from "@/lib/actions";

export default function DeletePledgeButton({ pledgeId }: { pledgeId: number }) {
  return (
    <form
      action={deletePledgeAction.bind(null, pledgeId)}
      onSubmit={(e) => {
        if (!confirm("هل تريد حذف هذه الفاتورة؟ تبقى محفوظة بالنظام ويمكن استعادتها لاحقًا.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        حذف الفاتورة
      </button>
    </form>
  );
}
