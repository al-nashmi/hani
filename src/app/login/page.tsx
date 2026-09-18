"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

const initialState: { error?: string } = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => {
      return loginAction(formData);
    },
    initialState
  );

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-slate-200"
      >
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-teal-800">حسين عبدالصمد للمجوهرات</h1>
          <p className="mt-1 text-sm text-slate-500">نظام إدارة المشتريات</p>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />

        {state?.error && (
          <p className="mt-3 text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "جارٍ الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
