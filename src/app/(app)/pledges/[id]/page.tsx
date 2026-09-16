import { notFound } from "next/navigation";
import Link from "next/link";
import { getPledge, redeemPledgeAction, forfeitPledgeAction } from "@/lib/actions";
import { computePledge, formatDate, formatSAR, todayUtc } from "@/lib/pledge-calc";
import StatusBadge from "@/components/StatusBadge";

export default async function PledgeDetailPage({ params }: PageProps<"/pledges/[id]">) {
  const { id } = await params;
  const pledge = await getPledge(Number(id));
  if (!pledge) notFound();

  const computed = computePledge(pledge, todayUtc());

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">عقد رهن رقم {pledge.contract_number}</h1>
          <Link href={`/customers/${pledge.customer_id}`} className="text-sm text-teal-700 hover:underline">
            {pledge.customer_full_name} - {pledge.customer_national_id}
          </Link>
        </div>
        <StatusBadge status={computed.effectiveStatus} />
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
        <h2 className="mb-4 font-semibold text-slate-800">بيانات الرهن والحساب اليومي</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Info label="مبلغ الرهن" value={formatSAR(Number(pledge.principal_amount))} />
          <Info label="نسبة الرهن الشهرية" value={`${pledge.monthly_rate_percent}%`} />
          <Info label="مدة الرهن" value={`${pledge.period_days} يوم`} />
          <Info label="تاريخ البدء" value={formatDate(pledge.start_date)} />
          <Info label="تاريخ الاستحقاق" value={computed.endDate.toISOString().slice(0, 10)} />
          <Info label="الأيام المستهلكة" value={String(computed.daysElapsed)} />
          <Info label="الأيام المتبقية" value={String(computed.daysRemaining)} />
          <Info label="الفائدة المتراكمة حتى اليوم" value={formatSAR(computed.feeAccrued)} />
          <Info label="إجمالي المستحق اليوم" value={formatSAR(computed.totalDue)} />
        </div>
        {pledge.notes && (
          <div className="mt-4">
            <p className="text-xs text-slate-500">ملاحظات</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">{pledge.notes}</p>
          </div>
        )}
      </section>

      {pledge.status === "redeemed" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-semibold text-slate-800">تمت التسوية</h2>
          <p className="text-sm text-slate-600">
            استُرجعت القطعة بتاريخ {pledge.redeemed_at ? formatDate(pledge.redeemed_at) : "-"} مقابل{" "}
            {formatSAR(Number(pledge.settlement_amount))}
          </p>
        </section>
      )}

      {computed.effectiveStatus === "forfeited" && pledge.status === "active" && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-800">
            انتهت مدة الرهن دون استرجاع العميل للقطعة، وبموجب شروط العقد آلت ملكيتها للمحل تلقائيًا.
          </p>
          <form action={forfeitPledgeAction.bind(null, pledge.id)} className="mt-3">
            <button
              type="submit"
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              تثبيت آلت للمحل في السجل
            </button>
          </form>
        </section>
      )}

      {pledge.status === "active" && !computed.isOverdue && (
        <form action={redeemPledgeAction.bind(null, pledge.id)}>
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            تسجيل استرجاع العميل للقطعة (تسوية بمبلغ {formatSAR(computed.totalDue)})
          </button>
        </form>
      )}
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
