"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PledgeWithCustomer } from "@/lib/db";
import type { PledgeComputed } from "@/lib/pledge-calc";
import type { PledgeSortKey } from "@/lib/actions";
import { formatDate, formatSAR } from "@/lib/pledge-calc";
import StatusBadge from "@/components/StatusBadge";
import CardField from "@/components/CardField";

type Row = { pledge: PledgeWithCustomer; computed: PledgeComputed };

type ColumnKey =
  | "contract_number"
  | "customer_full_name"
  | "item_type"
  | "principal_amount"
  | "start_date"
  | "daysElapsed"
  | "daysRemaining"
  | "totalDue"
  | "status";

type Column = {
  key: ColumnKey;
  label: string;
  /** Maps to a server-sortable column; omit for columns that can't be sorted without pulling the whole table. */
  sortKey?: PledgeSortKey;
  defaultDir: "asc" | "desc";
  render: (row: Row) => React.ReactNode;
};

const COLUMNS: Column[] = [
  {
    key: "contract_number",
    label: "رقم الفاتورة",
    sortKey: "contract_number",
    defaultDir: "asc",
    render: (r) => (
      <Link href={`/pledges/${r.pledge.id}`} className="font-medium text-teal-700 hover:underline">
        {r.pledge.contract_number}
      </Link>
    ),
  },
  {
    key: "customer_full_name",
    label: "العميل",
    sortKey: "customer_full_name",
    defaultDir: "asc",
    render: (r) => (
      <Link href={`/customers/${r.pledge.customer_id}`} className="hover:underline">
        {r.pledge.customer_full_name}
      </Link>
    ),
  },
  {
    key: "item_type",
    label: "القطعة",
    sortKey: "item_type",
    defaultDir: "asc",
    render: (r) => <span className="text-slate-600">{r.pledge.item_type}</span>,
  },
  {
    key: "principal_amount",
    label: "مبلغ الشراء",
    sortKey: "principal_amount",
    defaultDir: "desc",
    render: (r) => formatSAR(Number(r.pledge.principal_amount)),
  },
  {
    key: "start_date",
    label: "تاريخ الشراء",
    sortKey: "start_date",
    defaultDir: "desc",
    render: (r) => <span className="text-slate-600">{formatDate(r.pledge.start_date)}</span>,
  },
  {
    key: "daysElapsed",
    label: "أيام مستهلكة",
    defaultDir: "desc",
    render: (r) => r.computed.daysElapsed,
  },
  {
    key: "daysRemaining",
    label: "أيام متبقية",
    sortKey: "days_remaining",
    defaultDir: "asc",
    render: (r) => r.computed.daysRemaining,
  },
  {
    key: "totalDue",
    label: "مبلغ الاسترداد اليوم",
    sortKey: "total_due",
    defaultDir: "desc",
    render: (r) => <span className="font-medium">{formatSAR(r.computed.totalDue)}</span>,
  },
  {
    key: "status",
    label: "الحالة",
    defaultDir: "asc",
    render: (r) => <StatusBadge status={r.computed.effectiveStatus} />,
  },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((c) => c.key);
const COLUMN_BY_KEY = new Map(COLUMNS.map((c) => [c.key, c]));
const STORAGE_KEY = "pledgesTablePrefs";

export default function PledgesTable({
  rows,
  totalCount,
  page,
  pageSize,
  sortKey,
  sortDir,
  hasSortParam,
  baseParams,
}: {
  rows: Row[];
  totalCount: number;
  page: number;
  pageSize: number;
  sortKey: PledgeSortKey;
  sortDir: "asc" | "desc";
  hasSortParam: boolean;
  baseParams: { q: string; status: string };
}) {
  const router = useRouter();
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null);
  const skipNextSave = useRef(true);

  // Load persisted column order + (if the URL didn't specify one) the last-used sort.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { columnOrder?: unknown; sortKey?: unknown; sortDir?: unknown };
        if (
          Array.isArray(parsed.columnOrder) &&
          parsed.columnOrder.length === DEFAULT_COLUMN_ORDER.length &&
          DEFAULT_COLUMN_ORDER.every((k) => (parsed.columnOrder as unknown[]).includes(k))
        ) {
          setColumnOrder(parsed.columnOrder as ColumnKey[]);
        }
        if (!hasSortParam && typeof parsed.sortKey === "string" && (parsed.sortDir === "asc" || parsed.sortDir === "desc")) {
          const known = COLUMNS.some((c) => c.sortKey === parsed.sortKey);
          if (known && (parsed.sortKey !== sortKey || parsed.sortDir !== sortDir)) {
            const qs = new URLSearchParams();
            if (baseParams.q) qs.set("q", baseParams.q);
            qs.set("status", baseParams.status);
            qs.set("sort", parsed.sortKey as string);
            qs.set("dir", parsed.sortDir);
            router.replace(`/?${qs.toString()}`);
          }
        }
      }
    } catch {
      // localStorage unavailable — fall back to defaults silently
    }
    skipNextSave.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once on mount
  }, []);

  useEffect(() => {
    if (skipNextSave.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ columnOrder, sortKey, sortDir }));
    } catch {
      // ignore write failures (private mode, quota, etc.)
    }
  }, [columnOrder, sortKey, sortDir]);

  function sortHref(col: Column): string | null {
    if (!col.sortKey) return null;
    const nextDir = col.sortKey === sortKey ? (sortDir === "asc" ? "desc" : "asc") : col.defaultDir;
    const qs = new URLSearchParams();
    if (baseParams.q) qs.set("q", baseParams.q);
    qs.set("status", baseParams.status);
    qs.set("sort", col.sortKey);
    qs.set("dir", nextDir);
    return `/?${qs.toString()}`;
  }

  function pageHref(targetPage: number): string {
    const qs = new URLSearchParams();
    if (baseParams.q) qs.set("q", baseParams.q);
    qs.set("status", baseParams.status);
    qs.set("sort", sortKey);
    qs.set("dir", sortDir);
    qs.set("page", String(targetPage));
    return `/?${qs.toString()}`;
  }

  function handleDrop(targetKey: ColumnKey) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      return;
    }
    setColumnOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(dragKey);
      const to = next.indexOf(targetKey);
      next.splice(from, 1);
      next.splice(to, 0, dragKey);
      return next;
    });
    setDragKey(null);
  }

  const orderedColumns = useMemo(() => columnOrder.map((k) => COLUMN_BY_KEY.get(k)!), [columnOrder]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function handleSortSelect(value: string) {
    const [key, dir] = value.split(":");
    const qs = new URLSearchParams();
    if (baseParams.q) qs.set("q", baseParams.q);
    qs.set("status", baseParams.status);
    qs.set("sort", key);
    qs.set("dir", dir);
    router.push(`/?${qs.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Sort control + card list on phones/tablets so nothing needs horizontal scrolling; real table from lg up. */}
      <div className="lg:hidden">
        <label className="mb-1 block text-xs font-medium text-slate-700">ترتيب حسب</label>
        <select
          value={`${sortKey}:${sortDir}`}
          onChange={(e) => handleSortSelect(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        >
          {COLUMNS.filter((c) => c.sortKey).flatMap((c) => [
            <option key={`${c.sortKey}-asc`} value={`${c.sortKey}:asc`}>
              {c.label} (تصاعدي)
            </option>,
            <option key={`${c.sortKey}-desc`} value={`${c.sortKey}:desc`}>
              {c.label} (تنازلي)
            </option>,
          ])}
        </select>
      </div>

      <div className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <Link
            key={row.pledge.id}
            href={`/pledges/${row.pledge.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-teal-700">{row.pledge.contract_number}</span>
              <StatusBadge status={row.computed.effectiveStatus} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{row.pledge.customer_full_name}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
              <CardField label="القطعة" value={row.pledge.item_type} />
              <CardField label="مبلغ الشراء" value={formatSAR(Number(row.pledge.principal_amount))} />
              <CardField label="تاريخ الشراء" value={formatDate(row.pledge.start_date)} />
              <CardField label="أيام متبقية" value={String(row.computed.daysRemaining)} />
              <CardField
                label="مبلغ الاسترداد اليوم"
                value={formatSAR(row.computed.totalDue)}
                className="col-span-2"
              />
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            لا توجد مشتريات مطابقة
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white lg:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {orderedColumns.map((col) => {
                const href = sortHref(col);
                return (
                  <th
                    key={col.key}
                    className={`px-3 py-2 text-right font-semibold select-none ${
                      dragKey && dragKey !== col.key ? "bg-teal-50" : ""
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(col.key)}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        draggable
                        onDragStart={() => setDragKey(col.key)}
                        onDragEnd={() => setDragKey(null)}
                        className="cursor-move text-slate-400 hover:text-slate-600"
                        title="اسحب لترتيب الأعمدة"
                      >
                        ⠿
                      </span>
                      {href ? (
                        <Link href={href} className="flex items-center gap-1 hover:text-teal-700">
                          {col.label}
                          {sortKey === col.sortKey && <span>{sortDir === "desc" ? "▼" : "▲"}</span>}
                        </Link>
                      ) : (
                        <span>{col.label}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.pledge.id} className="border-t border-slate-100 hover:bg-slate-50">
                {orderedColumns.map((col) => (
                  <td key={col.key} className="px-3 py-2">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={orderedColumns.length} className="px-3 py-8 text-center text-slate-400">
                  لا توجد مشتريات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            عرض {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} من {totalCount}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium">
                السابق
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-300">
                السابق
              </span>
            )}
            <span>
              صفحة {page} من {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium">
                التالي
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-300">
                التالي
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
