"use client";

import { useState } from "react";

const PERIODS = [
  { value: "all", label: "الكل" },
  { value: "month", label: "شهري" },
  { value: "ytd", label: "سنوي (من بداية العام)" },
  { value: "range", label: "من / إلى" },
] as const;

export default function ReportPeriodFilter({
  initialPeriod,
  initialMonth,
  initialYear,
  initialFrom,
  initialTo,
}: {
  initialPeriod: string;
  initialMonth: string;
  initialYear: string;
  initialFrom: string;
  initialTo: string;
}) {
  const [period, setPeriod] = useState(initialPeriod);

  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">الفترة</label>
        <select
          name="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {period === "month" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">الشهر</label>
          <input
            type="month"
            name="month"
            defaultValue={initialMonth}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
      )}

      {period === "ytd" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">السنة</label>
          <input
            type="number"
            name="year"
            defaultValue={initialYear}
            min={2000}
            max={2100}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
      )}

      {period === "range" && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">من</label>
            <input
              type="date"
              name="from"
              defaultValue={initialFrom}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">إلى</label>
            <input
              type="date"
              name="to"
              defaultValue={initialTo}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </>
      )}

      <button
        type="submit"
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
      >
        تطبيق
      </button>
    </form>
  );
}
