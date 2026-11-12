"use client";

import { CartesianGrid, Line, LineChart as RLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function LineChart({
  data,
  xKey,
  yKey,
  height = 280,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="var(--ds-color-border)" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fill: "var(--ds-color-text-secondary)", fontSize: "var(--ds-bi-caption-size)" }} minTickGap={24} />
        <YAxis tick={{ fill: "var(--ds-color-text-secondary)", fontSize: "var(--ds-bi-caption-size)" }} />
        <Tooltip
          contentStyle={{
            background: "var(--ds-color-background)",
            border: "1px solid var(--ds-color-border)",
            color: "var(--ds-color-text-primary)",
          }}
        />
        <Line type="monotone" dataKey={yKey} stroke="var(--ds-color-primary-600)" strokeWidth={2} dot={false} />
      </RLineChart>
    </ResponsiveContainer>
  );
}
