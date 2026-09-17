"use client";

import { useActionState } from "react";
import { redeemPledgeFormAction } from "@/lib/actions";
import SignaturePad from "@/components/SignaturePad";

const initialState: { error?: string } = {};

export default function RedeemForm({
  pledgeId,
  customerName,
  customerNationalId,
  contractNumber,
  itemDescription,
  dateLabel,
  amountLabel,
}: {
  pledgeId: number;
  customerName: string;
  customerNationalId: string;
  contractNumber: string;
  itemDescription: string;
  dateLabel: string;
  amountLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => redeemPledgeFormAction(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="pledge_id" value={pledgeId} />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-800">صيغة سند الاستلام</h2>
        <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          أقر أنا الموقّع أدناه <b>{customerName}</b>، صاحب الهوية رقم <b>{customerNationalId}</b>، بأنني استلمت
          بتاريخ <b>{dateLabel}</b> من معرض هاني النمر للساعات والمجوهرات القطعة الموصوفة أدناه (
          <b>{itemDescription}</b>) وذلك عن الفاتورة رقم <b>{contractNumber}</b>، بعد سدادي كامل مبلغ إعادة الشراء
          وقدره <b>{amountLabel}</b>. وبهذا تكون عملية إعادة الشراء قد تمّت بالكامل، ولا يوجد لي أو لمن يخلفني أي حق
          أو مطالبة تجاه معرض هاني النمر بخصوص هذه القطعة أو هذه الفاتورة بعد تاريخه.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SignaturePad name="receipt_signature" label="توقيع العميل على سند الاستلام" />
      </section>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : `تأكيد الاستلام وتسجيل إعادة الشراء (${amountLabel})`}
      </button>
    </form>
  );
}
