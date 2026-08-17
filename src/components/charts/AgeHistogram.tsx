"use client";

import { BarChart } from "./BarChart";
import type { ContaPorFaixaEtaria } from "@/lib/data";

/** Histograma de faixa etária — thin wrapper de BarChart com destaque visual
 * pra barra "Não informado" (cor neutra) e ordenação fixa das faixas. */
export function AgeHistogram({ faixas, height = 260 }: { faixas: ContaPorFaixaEtaria[]; height?: number }) {
  return (
    <BarChart
      data={faixas as unknown as Record<string, string | number>[]}
      xKey="faixa"
      yKey="quantidade"
      height={height}
      corPorIndice={(i) =>
        faixas[i]?.faixa === "Não informado"
          ? "var(--ds-color-neutral-400)"
          : "var(--ds-color-primary-600)"
      }
    />
  );
}
