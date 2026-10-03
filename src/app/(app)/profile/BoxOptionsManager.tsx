"use client";

import { useActionState } from "react";
import { addBoxOptionFormAction } from "@/lib/actions";
import type { BoxOption } from "@/lib/db";

const initialState: { error?: string } = {};

export default function BoxOptionsManager({ options }: { options: BoxOption[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => addBoxOptionFormAction(formData),
    initialState
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-800">خيارات الصناديق</h2>
      <p className="mb-4 text-sm text-slate-500">
        هذه القائمة تظهر عند اختيار رقم الصندوق في فاتورة الشراء. أضف صندوقًا جديدًا إذا احتجت رقمًا أو خيارًا
        إضافيًا غير موجود.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {options.map((o) => (
          <span
            key={o.id}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {o.label}
          </span>
        ))}
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="label" className="mb-1 block text-xs font-medium text-slate-700">
            إضافة صندوق جديد
          </label>
          <input
            id="label"
            name="label"
            required
            placeholder="مثال: 37 أو تجوري 2"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "جارٍ الإضافة..." : "إضافة"}
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
