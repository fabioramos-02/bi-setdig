"use client";

import { Bar, BarChart as RBarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function BarChart({
  data,
  xKey,
  yKey,
  height = 260,
  corPorIndice,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  height?: number;
  /** Cor por barra (índice) — se omitido, usa a cor única padrão (comportamento anterior). */
  corPorIndice?: (index: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="var(--ds-color-border)" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fill: "var(--ds-color-text-secondary)", fontSize: 12 }} />
        <YAxis tick={{ fill: "var(--ds-color-text-secondary)", fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: "var(--ds-color-background)",
            border: "1px solid var(--ds-color-border)",
            color: "var(--ds-color-text-primary)",
          }}
        />
        <Bar dataKey={yKey} fill="var(--ds-color-primary-600)" radius={[4, 4, 0, 0]}>
          {corPorIndice && data.map((_, i) => <Cell key={i} fill={corPorIndice(i)} />)}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
