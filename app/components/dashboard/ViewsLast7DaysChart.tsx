"use client";

import { useMemo, useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ViewsDayPoint = { date: string; views: number };

function formatShortWeekday(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString("ro-RO", { weekday: "short" });
}

export function ViewsLast7DaysChart({
  data,
  totalViewsHint,
}: {
  data: ViewsDayPoint[];
  totalViewsHint: number;
}) {
  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        label: formatShortWeekday(row.date),
      })),
    [data]
  );

  const maxViews = useMemo(
    () => Math.max(1, ...chartData.map((d) => d.views)),
    [chartData]
  );

  const hasAnyDaily = chartData.some((d) => d.views > 0);
  const gradId = `dashViewsFill-${useId().replace(/:/g, "")}`;

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/75 bg-gradient-to-b from-zinc-900/55 via-zinc-950/95 to-[#08090d] p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.045] md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
      <div className="relative mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Analitică</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-white md:text-lg">
            Vizualizări — ultimele 7 zile
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500">
            Vizualizări înregistrate în jurnal (evenimente reale), pe anunțurile tale
          </p>
        </div>
      </div>

      <div className="relative rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-2 shadow-inner shadow-black/40 sm:p-3">
        <div className="h-[200px] w-full min-w-0 sm:h-[248px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 6"
              stroke="rgba(63, 63, 70, 0.5)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgb(161, 161, 170)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgb(63, 63, 70)" }}
            />
            <YAxis
              width={36}
              tick={{ fill: "rgb(113, 113, 122)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[0, maxViews]}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(24, 24, 27, 0.96)",
                border: "1px solid rgb(63, 63, 70)",
                borderRadius: "8px",
                boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              }}
              labelStyle={{ color: "rgb(161, 161, 170)", fontSize: 12 }}
              itemStyle={{ color: "#fafafa", fontSize: 13, fontWeight: 600 }}
              formatter={(value: number) => [
                `${value.toLocaleString("ro-RO")} vizualizări`,
                "",
              ]}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { date?: string } | undefined;
                if (!p?.date) return "";
                return new Date(`${p.date}T12:00:00.000Z`).toLocaleDateString(
                  "ro-RO",
                  { day: "numeric", month: "short" }
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke="rgb(249, 115, 22)"
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={{ fill: "rgb(249, 115, 22)", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>

      {!hasAnyDaily && totalViewsHint > 0 && (
        <p className="mt-4 text-center text-xs text-zinc-500 md:text-sm">
          Totalul din cardul „Vizualizări totale” vine din contorul fiecărui anunț.
          Graficul afișează doar vizualizările înregistrate în jurnal după activarea
          evenimentelor — încă nu există puncte în ultimele 7 zile.
        </p>
      )}
      {!hasAnyDaily && totalViewsHint === 0 && (
        <p className="mt-4 text-center text-xs text-zinc-500 md:text-sm">
          Publică un anunț pentru a începe să acumulezi vizualizări.
        </p>
      )}
    </div>
  );
}

export default ViewsLast7DaysChart;
