"use client";

import { useMemo } from "react";
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

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-8">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-white md:text-xl">
            Vizualizări — ultimele 7 zile
          </h3>
          <p className="text-sm text-white/45">
            Vizualizări înregistrate în jurnal (evenimente reale), pe anunțurile tale
          </p>
        </div>
      </div>

      <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="dashViewsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 6"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />
            <YAxis
              width={36}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={[0, maxViews]}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 18, 28, 0.92)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}
              itemStyle={{ color: "#fff", fontSize: 13, fontWeight: 600 }}
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
              stroke="rgb(167, 139, 250)"
              strokeWidth={2}
              fill="url(#dashViewsFill)"
              dot={{ fill: "rgb(167, 139, 250)", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {!hasAnyDaily && totalViewsHint > 0 && (
        <p className="mt-4 text-center text-xs text-white/40 md:text-sm">
          Totalul din cardul „Vizualizări totale” vine din contorul fiecărui anunț.
          Graficul afișează doar vizualizările înregistrate în jurnal după activarea
          evenimentelor — încă nu există puncte în ultimele 7 zile.
        </p>
      )}
      {!hasAnyDaily && totalViewsHint === 0 && (
        <p className="mt-4 text-center text-xs text-white/40 md:text-sm">
          Publică un anunț pentru a începe să acumulezi vizualizări.
        </p>
      )}
    </div>
  );
}
