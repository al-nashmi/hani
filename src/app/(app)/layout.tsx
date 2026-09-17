import Link from "next/link";
import { logoutAction, listReminders } from "@/lib/actions";
import NotificationBell from "@/components/NotificationBell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const reminders = await listReminders();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="print:hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-bold text-teal-800">
            مجوهرات هاني النمر
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/" className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
              المشتريات
            </Link>
            <Link href="/customers" className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
              العملاء
            </Link>
            <Link href="/reports" className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
              التقارير
            </Link>
            <Link
              href="/pledges/new"
              className="rounded-lg bg-teal-700 px-3 py-2 font-medium text-white hover:bg-teal-800"
            >
              + شراء جديد
            </Link>
            <a
              href="/api/export"
              className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
            >
              تصدير البيانات
            </a>
            <Link href="/profile" className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
              بيانات المحل
            </Link>
            <NotificationBell reminders={reminders} />
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-2 font-medium text-slate-500 hover:bg-slate-100"
              >
                خروج
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
