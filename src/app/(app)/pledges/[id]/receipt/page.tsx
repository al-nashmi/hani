import { notFound } from "next/navigation";
import { getPledge, getShopProfile } from "@/lib/actions";
import { formatDate, formatSAR } from "@/lib/pledge-calc";
import PrintButton from "../PrintButton";
import ShopStamp from "@/components/ShopStamp";

export default async function PledgeReceiptPage({ params }: PageProps<"/pledges/[id]/receipt">) {
  const { id } = await params;
  const [pledge, shopProfile] = await Promise.all([getPledge(Number(id)), getShopProfile()]);
  if (!pledge || pledge.status !== "redeemed" || !pledge.receipt_signature || !pledge.redeemed_at) {
    notFound();
  }

  const isOtherReceiver = Boolean(pledge.receiver_full_name);
  const declarantName = isOtherReceiver ? pledge.receiver_full_name! : pledge.customer_full_name;
  const declarantNationalId = isOtherReceiver ? pledge.receiver_national_id! : pledge.customer_national_id;

  return (
    <div className="mx-auto max-w-2xl">
      <PrintButton hint='اضغط طباعة، ثم اختر "حفظ كـ PDF" (Save as PDF) من قائمة الطابعة لتنزيل السند.' />

      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>

      <div className="rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0">
        <div className="mb-6 flex items-center justify-between border-b-2 border-teal-700 pb-4">
          <div>
            <h1 className="text-xl font-bold text-teal-800">{shopProfile.name}</h1>
            {shopProfile.commercial_registration && (
              <p className="text-xs text-slate-500">سجل تجاري: {shopProfile.commercial_registration}</p>
            )}
          </div>
          <div className="text-left">
            <p className="text-lg font-bold text-slate-800">سند استلام</p>
            <p className="text-sm text-slate-600">عن فاتورة رقم: {pledge.contract_number}</p>
            <p className="text-sm text-slate-600">تاريخ الاستلام: {formatDate(pledge.redeemed_at)}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <Field label="اسم العميل" value={pledge.customer_full_name} />
          <Field label="رقم الهوية" value={pledge.customer_national_id || "-"} />
        </div>

        {isOtherReceiver && (
          <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-amber-50 p-3 text-sm">
            <Field label="اسم مستلم القطعة" value={declarantName} />
            <Field label="رقم هوية المستلم" value={declarantNationalId || "-"} />
          </div>
        )}

        <div className="mb-6">
          <p className="text-xs text-slate-500">القطعة المستلمة</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{pledge.item_description}</p>
        </div>

        <div className="mb-6">
          <Field label="مبلغ إعادة الشراء المسدد" value={formatSAR(Number(pledge.settlement_amount))} />
        </div>

        <div className="mb-8">
          <h2 className="mb-2 text-sm font-bold text-slate-800">صيغة سند الاستلام</h2>
          <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
            أقر أنا الموقّع أدناه <b>{declarantName}</b>، صاحب الهوية رقم <b>{declarantNationalId || "غير مسجل"}</b>
            {isOtherReceiver ? (
              <>
                {" "}
                بصفتي مستلمًا للقطعة نيابة عن العميل <b>{pledge.customer_full_name}</b> (صاحب الهوية رقم{" "}
                <b>{pledge.customer_national_id || "غير مسجل"}</b>)
              </>
            ) : null}
            ، بأنني استلمت بتاريخ <b>{formatDate(pledge.redeemed_at)}</b> من <b>{shopProfile.name}</b> القطعة
            الموصوفة أعلاه (<b>{pledge.item_description}</b>) وذلك عن الفاتورة رقم <b>{pledge.contract_number}</b>،
            بعد سداد كامل مبلغ إعادة الشراء وقدره <b>{formatSAR(Number(pledge.settlement_amount))}</b>. وبهذا تكون
            عملية إعادة الشراء قد تمّت بالكامل، ولا يوجد لي أو لمن يخلفني أي حق أو مطالبة تجاه <b>{shopProfile.name}</b>{" "}
            بخصوص هذه القطعة أو هذه الفاتورة بعد تاريخه.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="mb-1 text-slate-500">{isOtherReceiver ? "توقيع المستلم" : "توقيع العميل"}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- stored base64 signature, not an optimizable asset */}
            <img
              src={pledge.receipt_signature}
              alt="توقيع مستلم القطعة"
              className="h-20 border-b border-slate-400"
            />
            {isOtherReceiver && pledge.receiver_id_photo && (
              <div className="mt-3">
                <p className="mb-1 text-slate-500">صورة هوية المستلم</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- stored base64 photo, not an optimizable asset */}
                <img
                  src={pledge.receiver_id_photo}
                  alt="صورة هوية المستلم"
                  className="h-32 rounded-lg border border-slate-300 object-contain"
                />
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-slate-500">توقيع مسلّم القطعة ({shopProfile.name})</p>
            <ShopStamp signature={shopProfile.signature} stamp={shopProfile.stamp} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
