"use client";

import { useActionState, useState } from "react";
import { redeemPledgeFormAction } from "@/lib/actions";
import SignaturePad from "@/components/SignaturePad";
import ImageAttachField from "@/components/ImageAttachField";

const initialState: { error?: string } = {};

export default function RedeemForm({
  pledgeId,
  customerName,
  customerNationalId,
  contractNumber,
  itemDescription,
  dateLabel,
  amountLabel,
  shopName,
}: {
  pledgeId: number;
  customerName: string;
  customerNationalId: string;
  contractNumber: string;
  itemDescription: string;
  dateLabel: string;
  amountLabel: string;
  shopName: string;
}) {
  const [isOtherReceiver, setIsOtherReceiver] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverNationalId, setReceiverNationalId] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => redeemPledgeFormAction(formData),
    initialState
  );

  const declarantName = isOtherReceiver ? receiverName || "......................" : customerName;
  const declarantNationalId = isOtherReceiver ? receiverNationalId || "......................" : customerNationalId;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="pledge_id" value={pledgeId} />
      <input type="hidden" name="is_other_receiver" value={isOtherReceiver ? "true" : "false"} />

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isOtherReceiver}
            onChange={(e) => setIsOtherReceiver(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          الشخص الذي يستلم القطعة اليوم غير العميل (البائع)
        </label>

        {isOtherReceiver && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                اسم المستلم <span className="text-red-500">*</span>
              </label>
              <input
                name="receiver_full_name"
                required={isOtherReceiver}
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                رقم هوية المستلم <span className="text-red-500">*</span>
              </label>
              <input
                name="receiver_national_id"
                required={isOtherReceiver}
                value={receiverNationalId}
                onChange={(e) => setReceiverNationalId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div className="sm:col-span-2">
              <ImageAttachField name="receiver_id_photo" label="صورة هوية المستلم (تصوير أو إرفاق)" />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-800">صيغة سند الاستلام</h2>
        <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          أقر أنا الموقّع أدناه <b>{declarantName}</b>، صاحب الهوية رقم <b>{declarantNationalId}</b>
          {isOtherReceiver ? (
            <>
              {" "}
              بصفتي مستلمًا للقطعة نيابة عن العميل <b>{customerName}</b> (صاحب الهوية رقم{" "}
              <b>{customerNationalId}</b>)
            </>
          ) : null}
          ، بأنني استلمت بتاريخ <b>{dateLabel}</b> من <b>{shopName}</b> القطعة الموصوفة أدناه (
          <b>{itemDescription}</b>) وذلك عن الفاتورة رقم <b>{contractNumber}</b>، بعد سداد كامل مبلغ إعادة الشراء
          وقدره <b>{amountLabel}</b>. وبهذا تكون عملية إعادة الشراء قد تمّت بالكامل، ولا يوجد لي أو لمن يخلفني أي حق
          أو مطالبة تجاه <b>{shopName}</b> بخصوص هذه القطعة أو هذه الفاتورة بعد تاريخه.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <SignaturePad name="receipt_signature" label={isOtherReceiver ? "توقيع المستلم" : "توقيع العميل على سند الاستلام"} />
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
