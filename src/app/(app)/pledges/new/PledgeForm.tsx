"use client";

import { useActionState, useMemo, useState } from "react";
import { createPledgeFormAction } from "@/lib/actions";
import type { Customer } from "@/lib/db";

const initialState: { error?: string } = {};

const ITEM_TYPES = ["ذهب", "مجوهرات", "ساعة", "أخرى"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PledgeForm({
  customers,
  preselectedCustomerId,
}: {
  customers: Customer[];
  preselectedCustomerId?: number;
}) {
  const preselected = preselectedCustomerId
    ? customers.find((c) => c.id === preselectedCustomerId)
    : undefined;

  const [mode, setMode] = useState<"existing" | "new">(preselected ? "existing" : "existing");
  const [nationalIdInput, setNationalIdInput] = useState(preselected?.national_id ?? "");

  const matched = useMemo(
    () => customers.find((c) => c.national_id === nationalIdInput.trim()),
    [customers, nationalIdInput]
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createPledgeFormAction(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">بيانات العميل</h2>

        <div className="mb-4 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              mode === "existing" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            عميل مسجل مسبقًا
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              mode === "new" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            عميل جديد
          </button>
        </div>

        <input type="hidden" name="customer_mode" value={mode} />

        {mode === "existing" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              رقم الهوية <span className="text-red-500">*</span>
            </label>
            <input
              list="customers-list"
              value={nationalIdInput}
              onChange={(e) => setNationalIdInput(e.target.value)}
              placeholder="اكتب رقم الهوية أو اسم العميل"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <datalist id="customers-list">
              {customers.map((c) => (
                <option key={c.id} value={c.national_id}>
                  {c.full_name}
                </option>
              ))}
            </datalist>
            <input type="hidden" name="customer_id" value={matched?.id ?? ""} />
            {matched ? (
              <p className="mt-2 text-sm text-emerald-700">
                تم العثور على العميل: <b>{matched.full_name}</b>
                {matched.phone ? ` - ${matched.phone}` : ""}
              </p>
            ) : (
              nationalIdInput.trim() !== "" && (
                <p className="mt-2 text-sm text-amber-700">
                  لا يوجد عميل بهذا الرقم. استخدم تبويب &quot;عميل جديد&quot; لتسجيله.
                </p>
              )
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="الاسم الكامل" name="new_full_name" required />
            <Field label="رقم الهوية" name="new_national_id" required />
            <Field label="الجنسية" name="new_nationality" />
            <Field label="رقم الجوال" name="new_phone" />
            <Field label="البريد الإلكتروني" name="new_email" type="email" />
            <Field label="تاريخ إصدار الهوية" name="new_id_issue_date" type="date" />
            <Field label="مصدر الهوية" name="new_id_issue_place" />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">بيانات القطعة والرهن</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="رقم العقد / الفاتورة" name="contract_number" required />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              نوع القطعة <span className="text-red-500">*</span>
            </label>
            <select
              name="item_type"
              required
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
              placeholder="مثال: سلسلة ذهب عيار 21 وزن 35 جرام..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <Field label="الوزن (جرام)" name="weight_grams" type="number" step="0.01" />
          <Field label="الرقم المرجعي" name="reference_number" />
          <Field label="رقم الصندوق" name="box_number" />
          <Field label="العائلة / المجموعة" name="family_group" />
          <Field label="مبلغ الرهن (ريال)" name="principal_amount" type="number" step="0.01" required />
          <Field label="نسبة الرهن الشهرية (%)" name="monthly_rate_percent" type="number" step="0.01" required defaultValue="5" />
          <Field label="مدة الرهن (يوم)" name="period_days" type="number" required defaultValue="90" />
          <Field label="تاريخ بدء الرهن" name="start_date" type="date" required defaultValue={todayStr()} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">ملاحظات</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      </section>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : "حفظ عملية الرهن"}
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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
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
        step={step}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}
