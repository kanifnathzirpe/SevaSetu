"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const CHART_COLORS = ["#0d9488", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    fontSize: "12px",
    color: "var(--card-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: "11px" },
};

export function TrendAreaChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: T[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          {series.map((item, index) => (
            <linearGradient key={item.key} id={`grad-${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={item.color ?? CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.45} />
              <stop offset="95%" stopColor={item.color ?? CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((item, index) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            fill={`url(#grad-${item.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}

export function SimpleBarChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
  layout = "horizontal",
}: {
  data: T[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
  layout?: "horizontal" | "vertical";
}) {
  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <BarChart data={data} layout={layout} margin={{ top: 8, right: 12, left: layout === "vertical" ? 10 : -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={layout === "vertical"} horizontal={layout === "horizontal"} />
          {layout === "horizontal" ? (
            <>
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} />
            </>
          ) : (
            <>
              <XAxis type="number" {...axisProps} />
              <YAxis type="category" dataKey={xKey} width={90} {...axisProps} />
            </>
          )}
          <Tooltip {...tooltipStyle} cursor={{ fill: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              fill={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
              radius={layout === "horizontal" ? [6, 6, 0, 0] : [0, 6, 6, 0]}
              maxBarSize={38}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: T[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipStyle} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((item, index) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2.4}
              dot={{ r: 2.5 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  nameKey,
  valueKey,
  height = 260,
}: {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  height?: number;
}) {
  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="50%"
            outerRadius="80%"
            paddingAngle={3}
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreGauge({ value, label, height = 200 }: { value: number; label?: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={[{ name: label ?? "Score", value }]}
          startAngle={210}
          endAngle={-30}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={16} fill="var(--primary)" />
          <text
            x="50%"
            y="52%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[var(--foreground)] text-3xl font-bold"
          >
            {value}
          </text>
          <text
            x="50%"
            y="70%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[var(--muted-foreground)] text-xs"
          >
            {label ?? "out of 100"}
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
