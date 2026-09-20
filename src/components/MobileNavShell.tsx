"use client";

import Link from "next/link";
import { useState } from "react";
import BottomNav from "./BottomNav";

export default function MobileNavShell({
  logoutAction,
}: {
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <BottomNav onMoreClick={() => setOpen((o) => !o)} moreActive={open} />

      {open && (
        <>
          <div className="print:hidden fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} />
          <div
            className="print:hidden fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-slate-200 bg-white p-2 shadow-2xl md:hidden"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
          >
            <div className="mx-auto mb-2 mt-1 h-1.5 w-10 rounded-full bg-slate-200" />
            <Link
              href="/opportunities/for-sale"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100"
            >
              الباحث عن الفرص
            </Link>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100"
            >
              بيانات المحل
            </Link>
            <a
              href="/api/export"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100"
            >
              تصدير البيانات
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="block w-full rounded-lg px-4 py-3 text-start text-sm font-medium text-red-600 active:bg-slate-100"
              >
                تسجيل خروج
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
