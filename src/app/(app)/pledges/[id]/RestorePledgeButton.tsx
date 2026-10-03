"use client";

import { restorePledgeAction } from "@/lib/actions";

export default function RestorePledgeButton({ pledgeId }: { pledgeId: number }) {
  return (
    <form action={restorePledgeAction.bind(null, pledgeId)}>
      <button
        type="submit"
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        استعادة الفاتورة
      </button>
    </form>
  );
}
