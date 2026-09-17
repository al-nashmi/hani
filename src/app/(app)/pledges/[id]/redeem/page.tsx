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

      <RedeemForm
        pledgeId={pledge.id}
        customerName={pledge.customer_full_name}
        customerNationalId={pledge.customer_national_id || "غير مسجل"}
        contractNumber={pledge.contract_number}
        itemDescription={pledge.item_description}
        dateLabel={formatDate(todayUtc())}
        amountLabel={formatSAR(computed.totalDue)}
        shopName={shopProfile.name}
      />
    </div>
  );
}
