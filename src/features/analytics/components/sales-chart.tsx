"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = {
  label: string;
  revenue: number;
  orders: number;
};

export function SalesChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
          />
          <YAxis
            yAxisId="revenue"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Net sales ($)"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke="var(--chart-2)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
