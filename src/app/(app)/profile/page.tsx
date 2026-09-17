import { getShopProfile } from "@/lib/actions";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getShopProfile();

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-bold text-slate-800">بيانات المحل</h1>
      <p className="mb-6 text-sm text-slate-500">
        تظهر هذه البيانات في صيغة المبايعة وسند الاستلام والفواتير المطبوعة.
      </p>
      <ProfileForm profile={profile} />
    </div>
  );
}
