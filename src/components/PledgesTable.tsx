"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PledgeWithCustomer } from "@/lib/db";
import type { PledgeComputed } from "@/lib/pledge-calc";
import { formatDate, formatSAR } from "@/lib/pledge-calc";
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

type Column = {
  key: ColumnKey;
  label: string;
  defaultDir: "asc" | "desc";
  sortValue: (row: Row) => string | number;
  render: (row: Row) => React.ReactNode;
};

const COLUMNS: Column[] = [
  {
    key: "contract_number",
    label: "رقم الفاتورة",
    defaultDir: "asc",
    sortValue: (r) => r.pledge.contract_number,
    render: (r) => (
      <Link href={`/pledges/${r.pledge.id}`} className="font-medium text-teal-700 hover:underline">
        {r.pledge.contract_number}
      </Link>
    ),
  },
  {
    key: "customer_full_name",
    label: "العميل",
    defaultDir: "asc",
    sortValue: (r) => r.pledge.customer_full_name,
    render: (r) => (
      <Link href={`/customers/${r.pledge.customer_id}`} className="hover:underline">
        {r.pledge.customer_full_name}
      </Link>
    ),
  },
  {
    key: "item_type",
    label: "القطعة",
    defaultDir: "asc",
    sortValue: (r) => r.pledge.item_type,
    render: (r) => <span className="text-slate-600">{r.pledge.item_type}</span>,
  },
  {
    key: "principal_amount",
    label: "مبلغ الشراء",
    defaultDir: "desc",
    sortValue: (r) => Number(r.pledge.principal_amount),
    render: (r) => formatSAR(Number(r.pledge.principal_amount)),
  },
  {
    key: "start_date",
    label: "تاريخ الشراء",
    defaultDir: "desc",
    sortValue: (r) => r.computed.startDate.getTime(),
    render: (r) => <span className="text-slate-600">{formatDate(r.pledge.start_date)}</span>,
  },
  {
    key: "daysElapsed",
    label: "أيام مستهلكة",
    defaultDir: "desc",
    sortValue: (r) => r.computed.daysElapsed,
    render: (r) => r.computed.daysElapsed,
  },
  {
    key: "daysRemaining",
    label: "أيام متبقية",
    defaultDir: "asc",
    sortValue: (r) => r.computed.daysRemaining,
    render: (r) => r.computed.daysRemaining,
  },
  {
    key: "totalDue",
    label: "مبلغ الاسترداد اليوم",
    defaultDir: "desc",
    sortValue: (r) => r.computed.totalDue,
    render: (r) => <span className="font-medium">{formatSAR(r.computed.totalDue)}</span>,
  },
  {
    key: "status",
    label: "الحالة",
    defaultDir: "asc",
    sortValue: (r) => r.computed.effectiveStatus,
    render: (r) => <StatusBadge status={r.computed.effectiveStatus} />,
  },
];

const DEFAULT_COLUMN_ORDER = COLUMNS.map((c) => c.key);
const COLUMN_BY_KEY = new Map(COLUMNS.map((c) => [c.key, c]));
const STORAGE_KEY = "pledgesTablePrefs";
const PAGE_SIZE = 50;

export default function PledgesTable({ rows }: { rows: Row[] }) {
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [sortKey, setSortKey] = useState<ColumnKey>("start_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          columnOrder?: unknown;
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
        if (typeof parsed.sortKey === "string" && COLUMN_BY_KEY.has(parsed.sortKey as ColumnKey)) {
          setSortKey(parsed.sortKey as ColumnKey);
        }
        if (parsed.sortDir === "asc" || parsed.sortDir === "desc") {
          setSortDir(parsed.sortDir);
        }
      }
    } catch {
      // localStorage unavailable — fall back to defaults silently
    }
    skipNextSave.current = false;
  }, []);

  useEffect(() => {
    if (skipNextSave.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ columnOrder, sortKey, sortDir }));
    } catch {
      // ignore write failures (private mode, quota, etc.)
    }
  }, [columnOrder, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [rows, sortKey, sortDir]);

  const sorted = useMemo(() => {
    const col = COLUMN_BY_KEY.get(sortKey)!;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue(a);
      const vb = col.sortValue(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "ar") * dir;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSort(key: ColumnKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(COLUMN_BY_KEY.get(key)!.defaultDir);
    }
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

  const orderedColumns = columnOrder.map((k) => COLUMN_BY_KEY.get(k)!);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {orderedColumns.map((col) => (
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
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-teal-700"
                    >
                      {col.label}
                      {sortKey === col.key && <span>{sortDir === "desc" ? "▼" : "▲"}</span>}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.pledge.id} className="border-t border-slate-100 hover:bg-slate-50">
                {orderedColumns.map((col) => (
                  <td key={col.key} className="px-3 py-2">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={orderedColumns.length} className="px-3 py-8 text-center text-slate-400">
                  لا توجد مشتريات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            عرض {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} من{" "}
            {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              السابق
            </button>
            <span>
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
