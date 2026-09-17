"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSAR } from "@/lib/pledge-calc";

const COLORS = {
  series1: "#2a78d6",
  series2: "#eb6834",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  mutedText: "#898781",
  primaryText: "#0b0b0b",
};

export type PledgeDatum = {
  contractNumber: string;
  invested: number;
  profit: number;
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: PledgeDatum }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md" dir="rtl">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-slate-600">المستثمر: {formatSAR(d.invested)}</p>
      <p className="text-slate-600">الأرباح: {formatSAR(d.profit)}</p>
    </div>
  );
}

export default function CustomerReportChart({ data }: { data: PledgeDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 50)}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="contractNumber"
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
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(11,11,11,0.04)" }} />
        <Legend
          formatter={(value: string) => (value === "invested" ? "المبلغ المستثمر" : "الأرباح")}
          wrapperStyle={{ fontSize: 12, color: COLORS.primaryText }}
        />
        <Bar dataKey="invested" name="invested" fill={COLORS.series1} radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="profit" name="profit" fill={COLORS.series2} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
