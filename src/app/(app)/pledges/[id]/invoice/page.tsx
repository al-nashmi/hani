import { notFound } from "next/navigation";
import { getPledge } from "@/lib/actions";
import { computePledge, formatDate, formatSAR, todayUtc } from "@/lib/pledge-calc";
import PrintButton from "./PrintButton";

export default async function PledgeInvoicePage({ params }: PageProps<"/pledges/[id]/invoice">) {
  const { id } = await params;
  const pledge = await getPledge(Number(id));
  if (!pledge) notFound();

  const computed = computePledge(pledge, todayUtc());

  return (
    <div className="mx-auto max-w-2xl">
      <PrintButton />

      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>

      <div className="rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0">
        <div className="mb-6 flex items-center justify-between border-b-2 border-teal-700 pb-4">
          <div>
            <h1 className="text-xl font-bold text-teal-800">مجوهرات هاني النمر</h1>
            <p className="text-xs text-slate-500">HANI ALNEMER JEWELRY</p>
          </div>
          <div className="text-left">
            <p className="text-lg font-bold text-slate-800">فاتورة رهن</p>
            <p className="text-sm text-slate-600">رقم الفاتورة: {pledge.contract_number}</p>
            <p className="text-sm text-slate-600">التاريخ: {formatDate(pledge.start_date)}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <Field label="اسم العميل" value={pledge.customer_full_name} />
          <Field label="رقم الهوية" value={pledge.customer_national_id} />
          {pledge.customer_phone && <Field label="رقم الجوال" value={pledge.customer_phone} />}
        </div>

        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-300 px-3 py-2 text-right">البيان</th>
              <th className="border border-slate-300 px-3 py-2 text-right">الوزن</th>
              <th className="border border-slate-300 px-3 py-2 text-right">السعر بالريال</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 px-3 py-2 align-top">
                <p className="font-medium">{pledge.item_type}</p>
                <p className="whitespace-pre-wrap text-slate-600">{pledge.item_description}</p>
              </td>
              <td className="border border-slate-300 px-3 py-2 align-top">
                {pledge.weight_grams ? `${pledge.weight_grams} جرام` : "-"}
              </td>
              <td className="border border-slate-300 px-3 py-2 align-top">
                {formatSAR(Number(pledge.principal_amount))}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td className="border border-slate-300 px-3 py-2" colSpan={2}>
                المجموع
              </td>
              <td className="border border-slate-300 px-3 py-2">{formatSAR(Number(pledge.principal_amount))}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="نسبة الرهن الشهرية" value={`${pledge.monthly_rate_percent}%`} />
          <Field label="مدة الرهن" value={`${pledge.period_days} يوم`} />
          <Field label="تاريخ الاستحقاق" value={computed.endDate.toISOString().slice(0, 10)} />
        </div>

        <p className="mb-8 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          أقر أنا الموقّع أدناه بكامل رضائي واختياري، وحالتي المعتبرة شرعًا ونظامًا، بأني قد رهنت القطعة الموصوفة
          أعلاه لدى معرض هاني النمر للساعات والمجوهرات مقابل المبلغ المذكور، على أن يحق لي استرجاعها خلال المدة
          المحددة أعلاه مقابل سداد المبلغ الأصلي والفائدة المستحقة. وفي حال عدم السداد أو الاسترجاع خلال هذه المدة،
          تؤول ملكية القطعة إلى المعرض تلقائيًا دون الحاجة لإشعار أو إخطار مسبق، ولا خيار لي في ذلك.
        </p>

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="mb-1 text-slate-500">توقيع البائع</p>
            <div className="h-20 border-b border-slate-400" />
          </div>
          <div>
            <p className="mb-1 text-slate-500">توقيع العميل</p>
            {pledge.customer_signature ? (
              // eslint-disable-next-line @next/next/no-img-element -- stored base64 signature, not an optimizable asset
              <img src={pledge.customer_signature} alt="توقيع العميل" className="h-20 border-b border-slate-400" />
            ) : (
              <div className="h-20 border-b border-slate-400" />
            )}
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
