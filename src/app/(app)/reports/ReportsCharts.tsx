"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatSAR } from "@/lib/pledge-calc";

const COLORS = {
  series1: "#2a78d6",
  series2: "#0ca30c",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  mutedText: "#898781",
  primaryText: "#0b0b0b",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
  neutral: "#898781",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  due_soon: "يقترب انتهاء الاسترداد",
  overdue: "متأخرة",
  forfeited: "ملك المحل",
  redeemed: "تم الاسترداد",
};

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.good,
  due_soon: COLORS.warning,
  overdue: "#e8590c",
  forfeited: COLORS.critical,
  redeemed: COLORS.neutral,
};

const ITEM_TYPE_COLORS: Record<string, string> = {
  ذهب: "#c9a227",
  ساعة: "#2a78d6",
  مجوهرات: "#a855c7",
  أخرى: COLORS.neutral,
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function CustomerNameTick(props: { x?: number; y?: number; payload?: { value?: string } }) {
  const { x = 0, y = 0, payload } = props;
  const text = truncate(payload?.value ?? "", 16);
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={COLORS.primaryText} fontSize={12}>
      {text}
    </text>
  );
}

export type TopCustomerDatum = {
  customerId: number;
  name: string;
  invested: number;
  profit: number;
  roi: number;
};

export type StatusDatum = {
  status: string;
  count: number;
};

export type ItemTypeChartDatum = {
  itemType: string;
  count: number;
  invested: number;
};

export type AgingChartDatum = {
  label: string;
  count: number;
  amountDue: number;
};

export type TrendChartDatum = {
  key: string;
  label: string;
  invested: number;
  profit: number;
};

function TopCustomerTooltip({ active, payload }: { active?: boolean; payload?: { payload: TopCustomerDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md" dir="rtl">
      <p className="font-semibold text-slate-800">{d.name}</p>
      <p className="text-slate-600">المستثمر: {formatSAR(d.invested)}</p>
      <p className="text-slate-600">الأرباح: {formatSAR(d.profit)}</p>
      <p className="text-slate-600">العائد: {d.roi.toFixed(1)}%</p>
    </div>
  );
}

function StatusTooltip({ active, payload }: { active?: boolean; payload?: { payload: StatusDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md" dir="rtl">
      <p className="font-semibold text-slate-800">{STATUS_LABELS[d.status] ?? d.status}</p>
      <p className="text-slate-600">{d.count} فاتورة</p>
    </div>
  );
}

function ItemTypeTooltip({ active, payload }: { active?: boolean; payload?: { payload: ItemTypeChartDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md" dir="rtl">
      <p className="font-semibold text-slate-800">{d.itemType}</p>
      <p className="text-slate-600">{d.count} فاتورة</p>
      <p className="text-slate-600">المستثمر: {formatSAR(d.invested)}</p>
    </div>
  );
}

function AgingTooltip({ active, payload }: { active?: boolean; payload?: { payload: AgingChartDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md" dir="rtl">
      <p className="font-semibold text-slate-800">{d.label}</p>
      <p className="text-slate-600">{d.count} فاتورة متأخرة</p>
      <p className="text-slate-600">المبلغ المستحق: {formatSAR(d.amountDue)}</p>
    </div>
  );
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: TrendChartDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md" dir="rtl">
      <p className="font-semibold text-slate-800">{d.label}</p>
      <p className="text-slate-600">مستثمر: {formatSAR(d.invested)}</p>
      <p className="text-slate-600">أرباح: {formatSAR(d.profit)}</p>
    </div>
  );
}

export function TopCustomersChart({ data }: { data: TopCustomerDatum[] }) {
  const router = useRouter();

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 52)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatSAR(v)}
          tick={{ fill: COLORS.mutedText, fontSize: 12 }}
          axisLine={{ stroke: COLORS.axis }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          interval={0}
          tick={<CustomerNameTick />}
          axisLine={{ stroke: COLORS.axis }}
          tickLine={false}
        />
        <Tooltip content={<TopCustomerTooltip />} cursor={{ fill: "rgba(11,11,11,0.04)" }} />
        <Bar
          dataKey="profit"
          fill={COLORS.series1}
          radius={[4, 4, 4, 4]}
          maxBarSize={26}
          onClick={(d) => {
            const customerId = (d.payload as TopCustomerDatum | undefined)?.customerId;
            if (customerId) router.push(`/reports/customers/${customerId}`);
          }}
          cursor="pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusDistributionChart({ data }: { data: StatusDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="status"
          tickFormatter={(s: string) => STATUS_LABELS[s] ?? s}
          tick={{ fill: COLORS.mutedText, fontSize: 12 }}
          axisLine={{ stroke: COLORS.axis }}
          tickLine={false}
        />
        <YAxis tick={{ fill: COLORS.mutedText, fontSize: 12 }} axisLine={{ stroke: COLORS.axis }} tickLine={false} allowDecimals={false} />
        <Tooltip content={<StatusTooltip />} cursor={{ fill: "rgba(11,11,11,0.04)" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? COLORS.neutral} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ItemTypeChart({ data }: { data: ItemTypeChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="itemType"
          tick={{ fill: COLORS.mutedText, fontSize: 12 }}
          axisLine={{ stroke: COLORS.axis }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatSAR(v)}
          tick={{ fill: COLORS.mutedText, fontSize: 12 }}
          axisLine={{ stroke: COLORS.axis }}
          tickLine={false}
        />
        <Tooltip content={<ItemTypeTooltip />} cursor={{ fill: "rgba(11,11,11,0.04)" }} />
        <Bar dataKey="invested" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {data.map((d) => (
            <Cell key={d.itemType} fill={ITEM_TYPE_COLORS[d.itemType] ?? COLORS.neutral} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AgingChart({ data }: { data: AgingChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: COLORS.mutedText, fontSize: 12 }}
          axisLine={{ stroke: COLORS.axis }}
          tickLine={false}
        />
        <YAxis tick={{ fill: COLORS.mutedText, fontSize: 12 }} axisLine={{ stroke: COLORS.axis }} tickLine={false} allowDecimals={false} />
        <Tooltip content={<AgingTooltip />} cursor={{ fill: "rgba(11,11,11,0.04)" }} />
        <Bar dataKey="count" fill={COLORS.critical} radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data }: { data: TrendChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: COLORS.mutedText, fontSize: 12 }}
          axisLine={{ stroke: COLORS.axis }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatSAR(v)}
          tick={{ fill: COLORS.mutedText, fontSize: 12 }}
          axisLine={{ stroke: COLORS.axis }}
          tickLine={false}
        />
        <Tooltip content={<TrendTooltip />} />
        <Legend
          formatter={(value: string) => (value === "invested" ? "مبلغ مستثمر" : "أرباح")}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Line type="monotone" dataKey="invested" stroke={COLORS.series1} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="profit" stroke={COLORS.series2} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
