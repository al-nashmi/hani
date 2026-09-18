import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/actions";
import EditCustomerForm from "./EditCustomerForm";

export default async function EditCustomerPage({ params }: PageProps<"/customers/[id]/edit">) {
  const { id } = await params;
  const customer = await getCustomer(Number(id));
  if (!customer) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-bold text-slate-800">تعديل بيانات العميل</h1>
      <EditCustomerForm customer={customer} />
    </div>
  );
}
