import Link from "next/link";
import { listCustomers } from "@/lib/actions";
import CardField from "@/components/CardField";

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const customers = await listCustomers(search);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800">العملاء</h1>
        <Link
          href="/customers/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          + عميل جديد
        </Link>
      </div>

      <form className="flex gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="بحث بالاسم / رقم الهوية / الجوال"
          className="w-72 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          بحث
        </button>
      </form>

      {/* Card list on phones/tablets so nothing needs horizontal scrolling; real table from lg up. */}
      <div className="space-y-3 lg:hidden">
        {customers.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <Link href={`/customers/${c.id}`} className="font-semibold text-teal-700 hover:underline">
              {c.full_name}
            </Link>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
              <CardField label="رقم الهوية" value={c.national_id || "-"} />
              <CardField label="الجنسية" value={c.nationality || "-"} />
              <CardField label="الجوال" value={c.phone || "-"} />
              <CardField label="البريد الإلكتروني" value={c.email || "-"} />
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            لا يوجد عملاء
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-semibold">الاسم</th>
              <th className="px-3 py-2 text-right font-semibold">رقم الهوية</th>
              <th className="px-3 py-2 text-right font-semibold">الجنسية</th>
              <th className="px-3 py-2 text-right font-semibold">الجوال</th>
              <th className="px-3 py-2 text-right font-semibold">البريد الإلكتروني</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link href={`/customers/${c.id}`} className="font-medium text-teal-700 hover:underline">
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-3 py-2">{c.national_id || "-"}</td>
                <td className="px-3 py-2 text-slate-600">{c.nationality || "-"}</td>
                <td className="px-3 py-2 text-slate-600">{c.phone || "-"}</td>
                <td className="px-3 py-2 text-slate-600">{c.email || "-"}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  لا يوجد عملاء
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
