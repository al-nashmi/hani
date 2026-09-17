"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReminderItem } from "@/lib/actions";

export default function NotificationBell({ reminders }: { reminders: ReminderItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label="تنبيهات تذكير العملاء"
      >
        <BellIcon />
        {reminders.length > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {reminders.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-20 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <p className="px-2 py-1 text-sm font-semibold text-slate-800">
              تذكير العملاء (قبل انتهاء الحجز بـ 15 يوم)
            </p>
            {reminders.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-slate-400">لا توجد تنبيهات حاليًا</p>
            ) : (
              <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                {reminders.map((r) => (
                  <li key={r.pledgeId} className="flex items-center justify-between gap-2 px-2 py-2">
                    <Link href={`/pledges/${r.pledgeId}`} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{r.customerName}</p>
                      <p className="text-xs text-slate-500">
                        فاتورة {r.contractNumber} - {r.isOverdue ? "متأخرة" : `باقي ${r.daysRemaining} يوم`}
                      </p>
                    </Link>
                    {r.whatsappUrl ? (
                      <a
                        href={r.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        واتساب
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-slate-400">لا يوجد جوال</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}
