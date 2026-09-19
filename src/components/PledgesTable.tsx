"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PledgeWithCustomer } from "@/lib/db";
import type { PledgeComputed } from "@/lib/pledge-calc";
import type { PledgeSortKey } from "@/lib/actions";
import { formatDate } from "@/lib/pledge-calc";
import StatusBadge from "@/components/StatusBadge";

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

/** "always" columns are the fixed minimum that must fit on one line even on the narrowest phone. */
type ColumnTier = "always" | "sm" | "md" | "lg" | "xl";

type Column = {
  key: ColumnKey;
  label: string;
  tier: ColumnTier;
  /** Maps to a server-sortable column; omit for columns that can't be sorted without pulling the whole table. */
  sortKey?: PledgeSortKey;
  defaultDir: "asc" | "desc";
  render: (row: Row) => React.ReactNode;
};

const compactSAR = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 0,
});

const COLUMNS: Column[] = [
  {
    key: "contract_number",
    label: "رقم الفاتورة",
    tier: "always",
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
    tier: "always",
    sortKey: "customer_full_name",
    defaultDir: "asc",
    render: (r) => (
      <Link
        href={`/customers/${r.pledge.customer_id}`}
        className="block max-w-[90px] truncate hover:underline sm:max-w-[160px] md:max-w-none"
        title={r.pledge.customer_full_name}
      >
        {r.pledge.customer_full_name}
      </Link>
    ),
  },
  {
    key: "totalDue",
    label: "المبلغ المطلوب",
    tier: "always",
    sortKey: "total_due",
    defaultDir: "desc",
    render: (r) => <span className="font-medium">{compactSAR.format(r.computed.totalDue)}</span>,
  },
  {
    key: "daysRemaining",
    label: "أيام متبقية",
    tier: "always",
    sortKey: "days_remaining",
    defaultDir: "asc",
    render: (r) => <span className="text-emerald-600">{r.computed.daysRemaining}</span>,
  },
  {
    key: "daysElapsed",
    label: "أيام مستهلكة",
    tier: "xl",
    defaultDir: "desc",
    render: (r) => <span className="text-red-600">{r.computed.daysElapsed}</span>,
  },
  {
    key: "status",
    label: "الحالة",
    tier: "always",
    defaultDir: "asc",
    render: (r) => <StatusBadge status={r.computed.effectiveStatus} compact />,
  },
  {
    key: "start_date",
    label: "تاريخ الشراء",
    tier: "sm",
    sortKey: "start_date",
    defaultDir: "desc",
    render: (r) => <span className="text-slate-600">{formatDate(r.pledge.start_date)}</span>,
  },
  {
    key: "item_type",
    label: "القطعة",
    tier: "md",
    sortKey: "item_type",
    defaultDir: "asc",
    render: (r) => <span className="text-slate-600">{r.pledge.item_type}</span>,
  },
  {
    key: "principal_amount",
    label: "مبلغ الشراء",
    tier: "lg",
    sortKey: "principal_amount",
    defaultDir: "desc",
    render: (r) => compactSAR.format(Number(r.pledge.principal_amount)),
  },
];

const OPTIONAL_COLUMNS = COLUMNS.filter((c) => c.tier !== "always");
const DEFAULT_COLUMN_ORDER = COLUMNS.map((c) => c.key);
const COLUMN_BY_KEY = new Map(COLUMNS.map((c) => [c.key, c]));
const STORAGE_KEY = "pledgesTablePrefs";

const TIER_HIDDEN_CLASS: Record<ColumnTier, string> = {
  always: "",
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

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
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [forcedVisible, setForcedVisible] = useState<Set<ColumnKey>>(new Set());
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const skipNextSave = useRef(true);
  const redirectedRef = useRef(false);

  // Load persisted column order, forced-visible columns, and (if the URL didn't specify one) the last-used sort.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          columnOrder?: unknown;
          forcedVisible?: unknown;
          sortKey?: unknown;
          sortDir?: unknown;
        };
        if (
          Array.isArray(parsed.columnOrder) &&
          parsed.columnOrder.length === DEFAULT_COLUMN_ORDER.length &&
          DEFAULT_COLUMN_ORDER.every((k) => (parsed.columnOrder as unknown[]).includes(k))
        ) {
          setColumnOrder(parsed.columnOrder as ColumnKey[]);
        }
        if (Array.isArray(parsed.forcedVisible)) {
          const known = new Set(OPTIONAL_COLUMNS.map((c) => c.key));
          setForcedVisible(new Set((parsed.forcedVisible as unknown[]).filter((k): k is ColumnKey => known.has(k as ColumnKey))));
        }
        if (!hasSortParam && typeof parsed.sortKey === "string" && (parsed.sortDir === "asc" || parsed.sortDir === "desc")) {
          const knownSort = COLUMNS.some((c) => c.sortKey === parsed.sortKey);
          if (knownSort && (parsed.sortKey !== sortKey || parsed.sortDir !== sortDir) && !redirectedRef.current) {
            redirectedRef.current = true;
            const qs = new URLSearchParams();
            if (baseParams.q) qs.set("q", baseParams.q);
            qs.set("status", baseParams.status);
            qs.set("sort", parsed.sortKey as string);
            qs.set("dir", parsed.sortDir);
            window.location.replace(`/?${qs.toString()}`);
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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ columnOrder, forcedVisible: Array.from(forcedVisible), sortKey, sortDir })
      );
    } catch {
      // ignore write failures (private mode, quota, etc.)
    }
  }, [columnOrder, forcedVisible, sortKey, sortDir]);

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

  function toggleForced(key: ColumnKey) {
    setForcedVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const orderedColumns = useMemo(() => columnOrder.map((k) => COLUMN_BY_KEY.get(k)!), [columnOrder]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            + أعمدة
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
              <div className="absolute end-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-semibold text-slate-500">
                  أظهر أعمدة إضافية دائمًا (بغض النظر عن حجم الشاشة)
                </p>
                {OPTIONAL_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={forcedVisible.has(col.key)}
                      onChange={() => toggleForced(col.key)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {orderedColumns.map((col) => {
                const href = sortHref(col);
                const hiddenClass = forcedVisible.has(col.key) ? "" : TIER_HIDDEN_CLASS[col.tier];
                return (
                  <th
                    key={col.key}
                    className={`px-2 py-2 text-right font-semibold select-none sm:px-3 ${hiddenClass} ${
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
                        className="hidden cursor-move text-slate-400 hover:text-slate-600 sm:inline"
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
                {orderedColumns.map((col) => {
                  const hiddenClass = forcedVisible.has(col.key) ? "" : TIER_HIDDEN_CLASS[col.tier];
                  return (
                    <td key={col.key} className={`whitespace-nowrap px-2 py-2 sm:px-3 ${hiddenClass}`}>
                      {col.render(row)}
                    </td>
                  );
                })}
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
