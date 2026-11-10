"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { formatValue } from "../format";
import type { AggregateResult, GroupBy } from "../schemas";

// 단일 계열이라 범례 없이 제목이 무엇을 그렸는지 말한다. 주황·빨강은 부족·품절 상태색이라 차트에 쓰지 않는다
const SERIES = "#2a78d6"; // dataviz 기본 팔레트 1번, 흰 배경 대비 검증 통과
const GRID = "#e5e8eb";
const TICK = { fill: "#8b95a1", fontSize: 12 };

type Row = AggregateResult["rows"][number];
type TooltipProps = TooltipContentProps<TooltipValueType, number | string>;

type StatsChartProps = {
  rows: Row[];
  unit: AggregateResult["unit"];
  groupBy: GroupBy;
  title: string;
};

export function StatsChart({ rows, unit, groupBy, title }: StatsChartProps) {
  const tooltip = (props: TooltipProps) => <ChartTooltip {...props} unit={unit} />;

  return (
    <figure aria-label={`${title} 차트`}>
      {groupBy === "item" || groupBy === "category" ? (
        // 품목명이 길어 가로 막대로 그리고, 칸이 적으니 막대 끝에 값을 적는다
        <ResponsiveContainer width="100%" height={rows.length * 40 + 16}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="label" width={96} tick={{ ...TICK, fill: "#4e5968", fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip content={tooltip} cursor={{ fill: "#f2f4f6" }} />
            <Bar dataKey="value" fill={SERIES} barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value) => (typeof value === "number" ? `${value}${unit}` : "")}
                style={{ fill: "#191f28", fontSize: 13, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : groupBy === "weekday" ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={unit === "시간"} />
            <Tooltip content={tooltip} cursor={{ fill: "#f2f4f6" }} />
            <Bar dataKey="value" fill={SERIES} barSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        // 기록 없는 날(null)은 이어 그리지 않아 0으로 오해되지 않게 끊는다
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={unit === "시간"} />
            <Tooltip content={tooltip} cursor={{ stroke: GRID }} />
            <Line
              dataKey="value"
              stroke={SERIES}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, fill: SERIES, stroke: "#ffffff", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <details className="mt-3 text-[14px]">
        <summary className="cursor-pointer text-fg-sub">표로 보기</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-1.5 font-normal text-fg-sub">
                  {row.label}
                </th>
                <td className="py-1.5 text-right tabular-nums">{formatValue(row.value, unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function ChartTooltip({ active, payload, label, unit }: TooltipProps & { unit: AggregateResult["unit"] }) {
  if (!active || !payload?.length) return null;
  const raw = payload[0].value;
  return (
    <div className="rounded-lg bg-fg px-3 py-2 text-[13px] text-white shadow-lg">
      <p className="text-white/70">{label}</p>
      <p className="font-semibold">{formatValue(typeof raw === "number" ? raw : null, unit)}</p>
    </div>
  );
}
