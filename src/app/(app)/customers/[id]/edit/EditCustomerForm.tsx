"use client";

import { useActionState } from "react";
import { updateCustomerFormAction } from "@/lib/actions";
import type { Customer } from "@/lib/db";
import { toISODateString } from "@/lib/pledge-calc";

const initialState: { error?: string } = {};

export default function EditCustomerForm({ customer }: { customer: Customer }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => updateCustomerFormAction(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <input type="hidden" name="customer_id" value={customer.id} />
      <Field label="الاسم الكامل" name="full_name" required defaultValue={customer.full_name} />
      <Field label="رقم الهوية" name="national_id" required defaultValue={customer.national_id ?? ""} />
      <Field label="الجنسية" name="nationality" defaultValue={customer.nationality ?? ""} />
      <Field label="رقم الجوال" name="phone" defaultValue={customer.phone ?? ""} />
      <Field label="البريد الإلكتروني" name="email" type="email" defaultValue={customer.email ?? ""} />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="تاريخ إصدار الهوية"
          name="id_issue_date"
          type="date"
          defaultValue={toISODateString(customer.id_issue_date)}
        />
        <Field label="مصدر الهوية" name="id_issue_place" defaultValue={customer.id_issue_place ?? ""} />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}
