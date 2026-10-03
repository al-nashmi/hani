import { getNextContractNumber, getShopProfile, listBoxOptions, listCustomers } from "@/lib/actions";
import PledgeForm from "./PledgeForm";

export default async function NewPledgePage({ searchParams }: PageProps<"/pledges/new">) {
  const params = await searchParams;
  const customerIdParam = typeof params.customer_id === "string" ? Number(params.customer_id) : undefined;
  const [customers, nextContractNumber, shopProfile, boxOptions] = await Promise.all([
    listCustomers(),
    getNextContractNumber(),
    getShopProfile(),
    listBoxOptions(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-xl font-bold text-slate-800">تسجيل عملية شراء جديدة</h1>
      <PledgeForm
        customers={customers}
        preselectedCustomerId={customerIdParam}
        nextContractNumber={nextContractNumber}
        shopName={shopProfile.name}
        shopCommercialRegistration={shopProfile.commercial_registration}
        boxOptions={boxOptions.map((o) => o.label)}
      />
    </div>
  );
}
