"use client";

import { Fragment, useState } from "react";

export type ContactLogRow = {
  id: number;
  methodLabel: string;
  contactedAtLabel: string;
  notes: string | null;
  attachment: string | null;
};

export default function ContactLogTable({ logs }: { logs: ContactLogRow[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
        لا يوجد تواصل مسجل بخصوص هذه الفاتورة بعد
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="w-10 px-3 py-2"></th>
            <th className="px-3 py-2 text-right font-semibold">طريقة التواصل</th>
            <th className="px-3 py-2 text-right font-semibold">التاريخ والوقت</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isOpen = expanded.has(log.id);
            return (
              <Fragment key={log.id}>
                <tr
                  onClick={() => toggle(log.id)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      ▼
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {log.methodLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{log.contactedAtLabel}</td>
                </tr>
                {isOpen && (
                  <tr className="border-t border-slate-100 bg-slate-50/60">
                    <td colSpan={3} className="px-4 py-3">
                      {log.notes && (
                        <p className="whitespace-pre-wrap text-sm text-slate-800">{log.notes}</p>
                      )}
                      {log.attachment && (
                        // eslint-disable-next-line @next/next/no-img-element -- stored base64 attachment, not an optimizable asset
                        <img
                          src={log.attachment}
                          alt="مرفق التواصل"
                          className="mt-2 max-h-64 rounded-lg border border-slate-200"
                        />
                      )}
                      {!log.notes && !log.attachment && (
                        <p className="text-sm text-slate-400">لا توجد تفاصيل إضافية</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
