"use client";

import { useActionState, useRef } from "react";
import { createContactLogAction } from "@/lib/actions";
import ImageAttachField from "@/components/ImageAttachField";

const initialState: { error?: string } = {};

const METHODS: { value: string; label: string }[] = [
  { value: "phone", label: "مكالمة هاتفية" },
  { value: "whatsapp", label: "واتساب" },
  { value: "sms", label: "رسالة نصية (SMS)" },
  { value: "in_person", label: "حضوريًا" },
  { value: "other", label: "أخرى" },
];

function nowLocalDatetime(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function ContactLogForm({ customerId, pledgeId }: { customerId: number; pledgeId: number }) {
  const contactedAtRef = useRef<HTMLInputElement>(null);

  // The datetime-local value has no timezone; convert it to an absolute
  // instant here in the browser (which knows the shop's real timezone)
  // instead of letting the server (Vercel, UTC) misinterpret it as UTC.
  function handleDateTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!contactedAtRef.current) return;
    contactedAtRef.current.value = e.target.value ? new Date(e.target.value).toISOString() : "";
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createContactLogAction(formData),
    initialState
  );

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="pledge_id" value={pledgeId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">طريقة التواصل</label>
          <select
            name="contact_method"
            required
            defaultValue="whatsapp"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">وقت التواصل</label>
          <input
            type="datetime-local"
            defaultValue={nowLocalDatetime()}
            onChange={handleDateTimeChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <input ref={contactedAtRef} type="hidden" name="contacted_at" defaultValue={new Date().toISOString()} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">ملاحظات</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="مثال: ذكّرناه بقرب موعد السداد، وعد بالسداد الأسبوع القادم"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <div className="sm:col-span-2">
          <ImageAttachField name="attachment" label="إرفاق سكرين شوت (واتساب/رسائل) - اختياري" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : "تسجيل التواصل"}
      </button>
    </form>
  );
}
