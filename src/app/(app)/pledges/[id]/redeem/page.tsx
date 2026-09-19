import { notFound, redirect } from "next/navigation";
import { getPledge, getShopProfile } from "@/lib/actions";
import { computePledge, formatDate, formatSAR, todayUtc } from "@/lib/pledge-calc";
import RedeemForm from "./RedeemForm";

export default async function RedeemPledgePage({ params }: PageProps<"/pledges/[id]/redeem">) {
  const { id } = await params;
  const [pledge, shopProfile] = await Promise.all([getPledge(Number(id)), getShopProfile()]);
  if (!pledge) notFound();

  const computed = computePledge(pledge, todayUtc());
  if (pledge.status !== "active") {
    redirect(`/pledges/${pledge.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">تسجيل إعادة شراء - فاتورة {pledge.contract_number}</h1>
        <p className="text-sm text-slate-600">
          {pledge.customer_full_name} - المبلغ المستحق اليوم: {formatSAR(computed.totalDue)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">القطعة</p>
          <p className="font-medium text-slate-800">{pledge.item_description}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">نوع القطعة</p>
          <p className="font-medium text-slate-800">{pledge.item_type}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">رقم الصندوق</p>
          <p className="font-medium text-slate-800">{pledge.box_number || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">الرقم المرجعي</p>
          <p className="font-medium text-slate-800">{pledge.reference_number || "-"}</p>
        </div>
      </div>

      <RedeemForm
        pledgeId={pledge.id}
        customerName={pledge.customer_full_name}
        customerNationalId={pledge.customer_national_id || "غير مسجل"}
        contractNumber={pledge.contract_number}
        itemDescription={pledge.item_description}
        dateLabel={formatDate(todayUtc())}
        suggestedAmount={Math.round(computed.totalDue * 100) / 100}
        shopName={shopProfile.name}
      />
    </div>
  );
}
