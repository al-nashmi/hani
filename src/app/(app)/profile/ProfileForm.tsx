"use client";

import { useActionState } from "react";
import { updateShopProfileFormAction } from "@/lib/actions";
import type { ShopProfile } from "@/lib/db";
import { digitsOnlyChange } from "@/lib/form-input";
import ImageAttachField from "@/components/ImageAttachField";
import SignaturePad from "@/components/SignaturePad";

const initialState: { error?: string } = {};

export default function ProfileForm({ profile }: { profile: ShopProfile }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => updateShopProfileFormAction(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <Field label="اسم المحل" name="name" required defaultValue={profile.name} />
      <Field
        label="رقم السجل التجاري"
        name="commercial_registration"
        digitsOnly
        defaultValue={profile.commercial_registration ?? ""}
      />
      <Field label="رقم الجوال / الهاتف" name="phone" digitsOnly defaultValue={profile.phone ?? ""} />
      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">
          العنوان
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={profile.address ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
      </div>

      <SignaturePad name="signature" label="توقيع المحل" defaultValue={profile.signature} required={false} />
      <ImageAttachField name="stamp" label="ختم المحل" defaultValue={profile.stamp} />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : "حفظ بيانات المحل"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required = false,
  defaultValue,
  digitsOnly = false,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  digitsOnly?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        onChange={digitsOnly ? digitsOnlyChange : undefined}
        inputMode={digitsOnly ? "numeric" : undefined}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}
