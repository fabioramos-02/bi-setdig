"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ContaPorAno } from "@/lib/data";

/** Barras verticais lado a lado por ano — replica o Qlik (Total × Ativas).
 * Ano corrente marcado como "(parcial)" no rótulo. */
export function ContasPorAnoChart({ dados, height = 300 }: { dados: ContaPorAno[]; height?: number }) {
  const anoAtual = new Date().getFullYear();
  const preparados = dados.map((r) => ({
    ano: r.ano === anoAtual ? `${r.ano} (parcial)` : String(r.ano),
    "Total de contas": r.criadas,
    "Contas ativas": r.ativas,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={preparados} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="var(--ds-color-border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="ano"
          tick={{ fill: "var(--ds-color-text-secondary)", fontSize: 12 }}
          tickMargin={6}
        />
        <YAxis
          tick={{ fill: "var(--ds-color-text-secondary)", fontSize: 12 }}
          tickFormatter={(v) => v.toLocaleString("pt-BR")}
        />
        <Tooltip
          contentStyle={{
            background: "var(--ds-color-background)",
            border: "1px solid var(--ds-color-border)",
            color: "var(--ds-color-text-primary)",
          }}
          formatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : String(v))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--ds-color-text-secondary)" }} />
        <Bar dataKey="Total de contas" fill="var(--ds-color-neutral-400)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Contas ativas" fill="var(--ds-color-primary-600)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
