import { notFound, redirect } from "next/navigation";
import { getCustomer, getPledge } from "@/lib/actions";
import EditPledgeForm from "./EditPledgeForm";

export default async function EditPledgePage({ params }: PageProps<"/pledges/[id]/edit">) {
  const { id } = await params;
  const pledge = await getPledge(Number(id));
  if (!pledge) notFound();
  if (pledge.deleted_at) {
    redirect(`/pledges/${pledge.id}`);
  }
  const customer = await getCustomer(pledge.customer_id);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">تعديل فاتورة {pledge.contract_number}</h1>
        <p className="text-sm text-slate-600">{pledge.customer_full_name}</p>
      </div>
      <EditPledgeForm pledge={pledge} customer={customer} />
    </div>
  );
}
