"use client";

import { useActionState, useRef, useState } from "react";
import { createContactLogAction } from "@/lib/actions";
import type { Pledge } from "@/lib/db";

const initialState: { error?: string } = {};

const METHODS: { value: string; label: string }[] = [
  { value: "phone", label: "مكالمة هاتفية" },
  { value: "whatsapp", label: "واتساب" },
  { value: "sms", label: "رسالة نصية (SMS)" },
  { value: "in_person", label: "حضوريًا" },
  { value: "other", label: "أخرى" },
];

const MAX_DIMENSION = 1100;

function nowLocalDatetime(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("تعذّر معالجة الصورة"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function ContactLogForm({ customerId, pledges }: { customerId: number; pledges: Pledge[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const contactedAtRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachError(null);
    try {
      const dataUrl = await resizeImageFile(file);
      if (inputRef.current) inputRef.current.value = dataUrl;
      setPreview(dataUrl);
    } catch {
      setAttachError("تعذّر معالجة الصورة، جرّب صورة أخرى");
    }
  }

  function clearAttachment() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <input ref={inputRef} type="hidden" name="attachment" />

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
        {pledges.length > 0 && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">بخصوص رهن (اختياري)</label>
            <select
              name="pledge_id"
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">بدون ربط برهن معيّن</option>
              {pledges.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.contract_number} - {p.item_type}
                </option>
              ))}
            </select>
          </div>
        )}
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
          <label className="mb-1 block text-sm font-medium text-slate-700">
            إرفاق سكرين شوت (واتساب/رسائل) - اختياري
          </label>
          {preview ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a client-picked file */}
              <img src={preview} alt="معاينة المرفق" className="h-20 rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={clearAttachment}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                إزالة المرفق
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="block w-full text-sm text-slate-600 file:ml-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          )}
          {attachError && <p className="mt-1 text-xs text-red-600">{attachError}</p>}
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
