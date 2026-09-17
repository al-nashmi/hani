"use client";

import { forfeitPledgeAction } from "@/lib/actions";

export default function ForfeitButton({ pledgeId }: { pledgeId: number }) {
  return (
    <form
      action={forfeitPledgeAction.bind(null, pledgeId)}
      onSubmit={(e) => {
        if (!confirm("هل أنت متأكد؟ هذا الإجراء نهائي ولا يمكن التراجع عنه، وستصبح القطعة ملكًا للمحل.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
      >
        إنهاء العملية وتحويل ملكية القطعة للمحل
      </button>
    </form>
  );
}
