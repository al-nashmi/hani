"use client";

import { useActionState } from "react";
import { updatePledgeFormAction } from "@/lib/actions";
import type { Customer, Pledge } from "@/lib/db";
import { ITEM_TYPES, toISODateString } from "@/lib/pledge-calc";
import { blockNumberLetterKeys, digitsOnlyChange } from "@/lib/form-input";
import ImageAttachField from "@/components/ImageAttachField";

const initialState: { error?: string } = {};

function dateStr(value: string | Date): string {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

export default function EditPledgeForm({ pledge, customer }: { pledge: Pledge; customer: Customer }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => updatePledgeFormAction(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="pledge_id" value={pledge.id} />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">بيانات العميل</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل" name="full_name" required defaultValue={customer.full_name} />
          <Field label="رقم الهوية" name="national_id" required digitsOnly defaultValue={customer.national_id ?? ""} />
          <Field label="الجنسية" name="nationality" defaultValue={customer.nationality ?? ""} />
          <Field label="رقم الجوال" name="phone" digitsOnly defaultValue={customer.phone ?? ""} />
          <Field label="البريد الإلكتروني" name="email" type="email" defaultValue={customer.email ?? ""} />
          <Field
            label="تاريخ إصدار الهوية"
            name="id_issue_date"
            type="date"
            defaultValue={toISODateString(customer.id_issue_date)}
          />
          <Field label="مصدر الهوية" name="id_issue_place" defaultValue={customer.id_issue_place ?? ""} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">بيانات القطعة والشراء</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="رقم الفاتورة" name="contract_number" required defaultValue={pledge.contract_number} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              نوع القطعة <span className="text-red-500">*</span>
            </label>
            <select
              name="item_type"
              required
              defaultValue={pledge.item_type}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              وصف القطعة <span className="text-red-500">*</span>
            </label>
            <textarea
              name="item_description"
              required
              rows={3}
              defaultValue={pledge.item_description}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <Field label="الوزن (جرام)" name="weight_grams" type="number" step="0.01" defaultValue={pledge.weight_grams ?? ""} />
          <Field label="الرقم المرجعي" name="reference_number" defaultValue={pledge.reference_number ?? ""} />
          <Field label="رقم الصندوق" name="box_number" defaultValue={pledge.box_number ?? ""} />
          <Field label="العائلة / المجموعة" name="family_group" defaultValue={pledge.family_group ?? ""} />
          <Field
            label="مبلغ الشراء (ريال)"
            name="principal_amount"
            type="number"
            step="0.01"
            required
            defaultValue={pledge.principal_amount}
          />
          <Field
            label="نسبة الاسترداد الشهرية (%)"
            name="monthly_rate_percent"
            type="number"
            step="0.01"
            required
            defaultValue={pledge.monthly_rate_percent}
          />
          <Field label="مدة الاسترداد (يوم)" name="period_days" type="number" required defaultValue={String(pledge.period_days)} />
          <Field label="تاريخ الشراء" name="start_date" type="date" required defaultValue={dateStr(pledge.start_date)} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">ملاحظات</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={pledge.notes ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <ImageAttachField name="item_photo" label="صورة البضاعة" defaultValue={pledge.item_photo} />
      </section>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
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
  step,
  defaultValue,
  digitsOnly = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
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
        type={type}
        required={required}
        step={step}
        defaultValue={defaultValue}
        onChange={digitsOnly ? digitsOnlyChange : undefined}
        onKeyDown={type === "number" ? blockNumberLetterKeys : undefined}
        inputMode={digitsOnly ? "numeric" : undefined}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}
