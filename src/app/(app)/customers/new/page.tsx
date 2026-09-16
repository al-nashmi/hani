"use client";

import { useActionState } from "react";
import { createCustomerFormAction } from "@/lib/actions";

const initialState: { error?: string } = {};

export default function NewCustomerPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createCustomerFormAction(formData),
    initialState
  );

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-bold text-slate-800">عميل جديد</h1>
      <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <Field label="الاسم الكامل" name="full_name" required />
        <Field label="رقم الهوية" name="national_id" required />
        <Field label="الجنسية" name="nationality" />
        <Field label="رقم الجوال" name="phone" />
        <Field label="البريد الإلكتروني" name="email" type="email" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ إصدار الهوية" name="id_issue_date" type="date" />
          <Field label="مصدر الهوية" name="id_issue_place" />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "جارٍ الحفظ..." : "حفظ العميل"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}
