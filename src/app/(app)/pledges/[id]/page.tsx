import { notFound } from "next/navigation";
import Link from "next/link";
import { getPledge, getShopProfile, listContactLogsForPledge } from "@/lib/actions";
import { computePledge, formatDate, formatDateTime, formatSAR, normalizeSaudiPhone, todayUtc } from "@/lib/pledge-calc";
import StatusBadge from "@/components/StatusBadge";
import ContactLogForm from "./ContactLogForm";
import ContactLogTable from "./ContactLogTable";
import ForfeitButton from "./ForfeitButton";

const CONTACT_METHOD_LABELS: Record<string, string> = {
  phone: "مكالمة هاتفية",
  whatsapp: "واتساب",
  sms: "رسالة نصية (SMS)",
  in_person: "حضوريًا",
  other: "أخرى",
};

export default async function PledgeDetailPage({ params }: PageProps<"/pledges/[id]">) {
  const { id } = await params;
  const pledge = await getPledge(Number(id));
  if (!pledge) notFound();

  const [contactLogs, shopProfile] = await Promise.all([
    listContactLogsForPledge(pledge.id),
    getShopProfile(),
  ]);
  const computed = computePledge(pledge, todayUtc());
  const normalizedPhone = pledge.customer_phone ? normalizeSaudiPhone(pledge.customer_phone) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">فاتورة شراء رقم {pledge.contract_number}</h1>
          <Link href={`/customers/${pledge.customer_id}`} className="text-sm text-teal-700 hover:underline">
            {pledge.customer_full_name} - {pledge.customer_national_id}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={computed.effectiveStatus} />
          <Link
            href={`/pledges/${pledge.id}/invoice`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            طباعة / تحميل PDF
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">بيانات القطعة</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Info label="نوع القطعة" value={pledge.item_type} />
          <Info label="الوزن" value={pledge.weight_grams ? `${pledge.weight_grams} جرام` : "-"} />
          <Info label="الرقم المرجعي" value={pledge.reference_number || "-"} />
          <Info label="رقم الصندوق" value={pledge.box_number || "-"} />
          <Info label="العائلة / المجموعة" value={pledge.family_group || "-"} />
        </div>
        <div className="mt-4">
          <p className="text-xs text-slate-500">الوصف</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-800">{pledge.item_description}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">بيانات الشراء وحساب الاسترداد اليومي</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Info label="مبلغ الشراء" value={formatSAR(Number(pledge.principal_amount))} />
          <Info label="نسبة الاسترداد الشهرية" value={`${pledge.monthly_rate_percent}%`} />
          <Info label="مدة الاسترداد" value={`${pledge.period_days} يوم`} />
          <Info label="تاريخ الشراء" value={formatDate(pledge.start_date)} />
          <Info label="تاريخ انتهاء الاسترداد" value={computed.endDate.toISOString().slice(0, 10)} />
          <div>
            <p className="text-xs text-slate-500">الأيام (المستهلكة / المتبقية)</p>
            <p className="mt-0.5 font-medium">
              <span className="text-red-600">{computed.daysElapsed} يوم</span>
              <span className="text-slate-400"> / </span>
              <span className="text-emerald-600">{computed.daysRemaining} يوم</span>
            </p>
          </div>
          <Info label="قيمة الاسترداد المتراكمة حتى اليوم" value={formatSAR(computed.feeAccrued)} />
          <Info label="إجمالي مبلغ الاسترداد اليوم" value={formatSAR(computed.totalDue)} />
        </div>
        {pledge.notes && (
          <div className="mt-4">
            <p className="text-xs text-slate-500">ملاحظات</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">{pledge.notes}</p>
          </div>
        )}
        {pledge.customer_signature && (
          <div className="mt-4">
            <p className="mb-1 text-xs text-slate-500">توقيع البائع (العميل)</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- stored base64 signature, not an optimizable asset */}
            <img
              src={pledge.customer_signature}
              alt="توقيع البائع"
              className="h-28 rounded-lg border border-slate-200 bg-white"
            />
          </div>
        )}
      </section>

      {pledge.status === "redeemed" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-semibold text-slate-800">تم الاسترداد</h2>
          <p className="text-sm text-slate-600">
            أعاد العميل شراء القطعة بتاريخ {pledge.redeemed_at ? formatDate(pledge.redeemed_at) : "-"} مقابل{" "}
            {formatSAR(Number(pledge.settlement_amount))}
          </p>
          {pledge.receipt_signature && (
            <Link
              href={`/pledges/${pledge.id}/receipt`}
              className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              طباعة سند الاستلام
            </Link>
          )}
        </section>
      )}

      {computed.isOverdue && pledge.status === "active" && (
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm text-orange-900">
            تجاوزت الفاتورة مدة الاسترداد ({pledge.period_days} يوم) ولم يقم العميل باسترداد القطعة بعد. القطعة لا
            تزال في حالة <b>متأخرة</b> ولم تنتقل ملكيتها للمحل، ويمكن للعميل استردادها حتى الآن. الملكية لا تنتقل
            للمحل إلا إذا قررت إنهاء العملية بالضغط على الزر أدناه.
          </p>
          <div className="mt-3">
            <ForfeitButton pledgeId={pledge.id} />
          </div>
        </section>
      )}

      {pledge.status === "active" && (
        <Link
          href={`/pledges/${pledge.id}/redeem`}
          className="inline-block rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          تسجيل إعادة شراء العميل للقطعة (بمبلغ {formatSAR(computed.totalDue)})
        </Link>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">سجل التواصل مع العميل</h2>
        <ContactLogForm
          customerId={pledge.customer_id}
          pledgeId={pledge.id}
          customerPhone={pledge.customer_phone}
          normalizedPhone={normalizedPhone}
          customerName={pledge.customer_full_name}
          contractNumber={pledge.contract_number}
          shopName={shopProfile.name}
        />
        <ContactLogTable
          logs={contactLogs.map((log) => ({
            id: log.id,
            methodLabel: CONTACT_METHOD_LABELS[log.contact_method] ?? log.contact_method,
            contactedAtLabel: formatDateTime(log.contacted_at),
            notes: log.notes,
            attachment: log.attachment,
          }))}
        />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  );
}
