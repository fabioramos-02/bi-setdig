"use client";

import { BarChart } from "./BarChart";
import type { ContaPorFaixaEtaria } from "@/lib/data";

/** Histograma de faixa etária — só as faixas com data informada. A parcela
 * "Não informado" sai do gráfico (a barra dominava a escala e escondia o
 * perfil real de quem informou) e vira nota/KPI fora, no chamador. */
export function AgeHistogram({ faixas, height = 260 }: { faixas: ContaPorFaixaEtaria[]; height?: number }) {
  const comInfo = faixas.filter((f) => f.faixa !== "Não informado");
  return (
    <BarChart
      data={comInfo as unknown as Record<string, string | number>[]}
      xKey="faixa"
      yKey="quantidade"
      height={height}
    />
  );
}
