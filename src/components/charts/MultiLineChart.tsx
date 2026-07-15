"use client";

import { CartesianGrid, Line, LineChart as RLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { corCategorica } from "@/lib/categorical-palette";

export type SerieLinha = { key: string; label: string };

/** Várias linhas no mesmo eixo (ex. evolução de N serviços) — cada série ganha
 * uma cor da paleta categórica. `data` = [{[xKey], [serie.key]: number}]. */
export function MultiLineChart({
  data,
  xKey,
  series,
  height = 280,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: SerieLinha[];
  height?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={height}>
        <RLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--ds-color-border)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fill: "var(--ds-color-text-secondary)", fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fill: "var(--ds-color-text-secondary)", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "var(--ds-color-background)",
              border: "1px solid var(--ds-color-border)",
              color: "var(--ds-color-text-primary)",
            }}
          />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={corCategorica(i)} strokeWidth={2} dot={false} />
          ))}
        </RLineChart>
      </ResponsiveContainer>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {series.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corCategorica(i) }} />
            <span style={{ color: "var(--ds-color-text-secondary)" }}>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
