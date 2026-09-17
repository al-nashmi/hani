"use client";

import { useActionState, useMemo, useState } from "react";
import { createPledgeFormAction } from "@/lib/actions";
import type { Customer } from "@/lib/db";
import { formatSAR } from "@/lib/pledge-calc";
import SignaturePad from "@/components/SignaturePad";
import ImageAttachField from "@/components/ImageAttachField";

const initialState: { error?: string } = {};

const ITEM_TYPES = ["ذهب", "مجوهرات", "ساعة", "أخرى"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function matchesCustomer(c: Customer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    c.full_name.toLowerCase().includes(q) ||
    c.national_id.toLowerCase().includes(q) ||
    (c.phone ?? "").toLowerCase().includes(q) ||
    (c.email ?? "").toLowerCase().includes(q)
  );
}

export default function PledgeForm({
  customers,
  preselectedCustomerId,
  nextContractNumber,
  shopName,
  shopCommercialRegistration,
}: {
  customers: Customer[];
  preselectedCustomerId?: number;
  nextContractNumber: string;
  shopName: string;
  shopCommercialRegistration: string | null;
}) {
  const preselected = preselectedCustomerId
    ? customers.find((c) => c.id === preselectedCustomerId)
    : undefined;

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(preselected);
  const [searchQuery, setSearchQuery] = useState("");

  // Tracked (in addition to being normal form fields) so the sale
  // declaration below can show the actual values as the owner types them.
  const [newFullName, setNewFullName] = useState("");
  const [newNationalId, setNewNationalId] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("5");
  const [periodDays, setPeriodDays] = useState("90");
  const [startDate, setStartDate] = useState(todayStr());

  const matches = useMemo(
    () => (selectedCustomer ? [] : customers.filter((c) => matchesCustomer(c, searchQuery)).slice(0, 8)),
    [customers, searchQuery, selectedCustomer]
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createPledgeFormAction(formData),
    initialState
  );

  const declarationName = selectedCustomer ? selectedCustomer.full_name : newFullName;
  const declarationNationalId = selectedCustomer ? selectedCustomer.national_id : newNationalId;
  const declarationPrice = principalAmount ? formatSAR(Number(principalAmount)) : "......";

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
              ابحث عن العميل <span className="text-red-500">*</span>
            </label>
            <input type="hidden" name="customer_id" value={selectedCustomer?.id ?? ""} />

            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-sm text-emerald-800">
                  <b>{selectedCustomer.full_name}</b> - {selectedCustomer.national_id}
                  {selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(undefined);
                    setSearchQuery("");
                  }}
                  className="text-xs font-medium text-emerald-800 underline"
                >
                  تغيير
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="اكتب الاسم أو رقم الجوال أو رقم الهوية أو البريد الإلكتروني"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                {searchQuery.trim() !== "" && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    {matches.length > 0 ? (
                      matches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setSearchQuery("");
                          }}
                          className="block w-full border-b border-slate-100 px-3 py-2 text-right text-sm last:border-b-0 hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-800">{c.full_name}</span>
                          <span className="text-slate-500"> - {c.national_id}</span>
                          {c.phone && <span className="text-slate-500"> - {c.phone}</span>}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-amber-700">
                        لا يوجد عميل مطابق. استخدم تبويب &quot;عميل جديد&quot; لتسجيله.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="الاسم الكامل"
              name="new_full_name"
              required
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
            />
            <Field
              label="رقم الهوية"
              name="new_national_id"
              required
              value={newNationalId}
              onChange={(e) => setNewNationalId(e.target.value)}
            />
            <Field label="الجنسية" name="new_nationality" />
            <Field label="رقم الجوال" name="new_phone" />
            <Field label="البريد الإلكتروني" name="new_email" type="email" />
            <Field label="تاريخ إصدار الهوية" name="new_id_issue_date" type="date" />
            <Field label="مصدر الهوية" name="new_id_issue_place" />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">بيانات القطعة والشراء</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Field label="رقم الفاتورة" name="contract_number" required defaultValue={nextContractNumber} />
            <p className="mt-1 text-xs text-slate-500">
              مُولَّد تلقائيًا. عدّله يدويًا فقط لتسجيل فاتورة قديمة بأثر رجعي.
            </p>
          </div>
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
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="مثال: سلسلة ذهب عيار 21 وزن 35 جرام..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <Field label="الوزن (جرام)" name="weight_grams" type="number" step="0.01" />
          <Field label="الرقم المرجعي" name="reference_number" />
          <Field label="رقم الصندوق" name="box_number" />
          <Field label="العائلة / المجموعة" name="family_group" />
          <Field
            label="مبلغ الشراء (ريال)"
            name="principal_amount"
            type="number"
            step="0.01"
            required
            value={principalAmount}
            onChange={(e) => setPrincipalAmount(e.target.value)}
          />
          <Field
            label="نسبة الاسترداد الشهرية (%)"
            name="monthly_rate_percent"
            type="number"
            step="0.01"
            required
            value={monthlyRate}
            onChange={(e) => setMonthlyRate(e.target.value)}
          />
          <Field
            label="مدة الاسترداد (يوم)"
            name="period_days"
            type="number"
            required
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
          />
          <Field
            label="تاريخ الشراء"
            name="start_date"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
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

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-800">صيغة المبايعة</h2>
        <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          أقر أنا الموقّع أدناه <b>{declarationName || "......................"}</b>، صاحب الهوية رقم{" "}
          <b>{declarationNationalId || "......................"}</b>، بكامل رضائي واختياري وحالتي المعتبرة شرعًا
          ونظامًا، بأنني بعت بتاريخ <b>{startDate}</b> إلى <b>{shopName}</b>
          {shopCommercialRegistration ? (
            <>
              {" "}
              (سجل تجاري رقم <b>{shopCommercialRegistration}</b>)
            </>
          ) : null}{" "}
          القطعة الموصوفة أعلاه (<b>{itemDescription || "......................"}</b>) بثمن قدره{" "}
          <b>{declarationPrice}</b>، وقد استلمت الثمن المذكور كاملاً، وذلك بيعًا باتًا ونهائيًا لا رجعة فيه، انتقلت
          به ملكية القطعة المذكورة إلى <b>{shopName}</b> بشكل كامل ونهائي من تاريخه، ولا خيار لي أو لأي طرف في هذا
          البيع.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <SignaturePad name="customer_signature" label="توقيع البائع (العميل)" />
        <ImageAttachField
          name="item_photo"
          label="صورة البضاعة (تصوير أو إرفاق) - يفضّل إظهار بطاقة العميل مع البضاعة في نفس الصورة - اختياري"
        />
      </section>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : "حفظ عملية الشراء"}
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
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
      />
    </div>
  );
}
