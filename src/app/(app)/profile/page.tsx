import { getShopProfile } from "@/lib/actions";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getShopProfile();

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="mb-2 text-xl font-bold text-slate-800">بيانات المحل</h1>
        <p className="mb-6 text-sm text-slate-500">
          تظهر هذه البيانات في صيغة المبايعة وسند الاستلام والفواتير المطبوعة.
        </p>
        <ProfileForm profile={profile} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-semibold text-slate-800">تصدير جميع بيانات النظام</h2>
        <p className="mb-4 text-sm text-slate-500">
          ملف إكسل متكامل بكل العملاء والفواتير وبيانات المحل، بنفس أسلوب دفتر المتابعة الأصلي —
          بصيغ حسابية حية (تتحدّث تلقائيًا عند فتح الملف لاحقًا) وشروط تحقق على القيم (المبالغ لا
          تقبل أرقامًا سالبة، والتواريخ يجب أن تكون صحيحة). مناسب لو احتجتم مواصلة العمل خارج
          النظام في أي وقت.
        </p>
        <a
          href="/api/export/full"
          className="inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          تصدير جميع البيانات
        </a>
      </div>
    </div>
  );
}
