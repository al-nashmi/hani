import { notFound, redirect } from "next/navigation";
import { getCustomer, getPledge, listBoxOptions } from "@/lib/actions";
import EditPledgeForm from "./EditPledgeForm";
import BackButton from "@/components/BackButton";

export default async function EditPledgePage({ params }: PageProps<"/pledges/[id]/edit">) {
  const { id } = await params;
  const pledge = await getPledge(Number(id));
  if (!pledge) notFound();
  if (pledge.deleted_at) {
    redirect(`/pledges/${pledge.id}`);
  }
  const [customer, boxOptionRows] = await Promise.all([getCustomer(pledge.customer_id), listBoxOptions()]);
  if (!customer) notFound();

  const boxOptions = boxOptionRows.map((o) => o.label);
  // The pledge's current box might be an old free-text value not in the configured list
  // (legacy data, e.g. "D1") — keep it selectable so saving without touching this field doesn't wipe it out.
  if (pledge.box_number && !boxOptions.includes(pledge.box_number)) {
    boxOptions.unshift(pledge.box_number);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackButton />
      <div>
        <h1 className="text-xl font-bold text-slate-800">تعديل فاتورة {pledge.contract_number}</h1>
        <p className="text-sm text-slate-600">{pledge.customer_full_name}</p>
      </div>
      <EditPledgeForm pledge={pledge} customer={customer} boxOptions={boxOptions} />
    </div>
  );
}
