"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import type { VisitaDiaria } from "@/lib/data";

/**
 * Filtro de período client-side sobre uma série já publicada (90 dias).
 * Sem chamada nova ao Matomo — ADR-001 (dados só chegam via datasets/
 * estáticos, nunca API em runtime). Estreitar o range é um array.filter
 * local, não uma nova consulta.
 */
export function TrendFilter({ dados }: { dados: VisitaDiaria[] }) {
  const min = dados[0]?.data ?? "";
  const max = dados[dados.length - 1]?.data ?? "";
  const [inicio, setInicio] = useState(min);
  const [fim, setFim] = useState(max);

  const filtrados = useMemo(
    () => dados.filter((d) => d.data >= inicio && d.data <= fim),
    [dados, inicio, fim]
  );

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 mb-4 print:hidden">
        <label className="text-sm">
          <span style={{ color: "var(--ds-color-text-secondary)" }} className="block mb-1">
            De
          </span>
          <input
            type="date"
            value={inicio}
            min={min}
            max={fim}
            onChange={(e) => setInicio(e.target.value)}
            style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-sm)" }}
            className="px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          <span style={{ color: "var(--ds-color-text-secondary)" }} className="block mb-1">
            Até
          </span>
          <input
            type="date"
            value={fim}
            min={inicio}
            max={max}
            onChange={(e) => setFim(e.target.value)}
            style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-sm)" }}
            className="px-2 py-1 text-sm"
          />
        </label>
        <ExportCsvButton rows={filtrados} filename="visitas-diarias" />
      </div>
      <LineChart data={filtrados} xKey="data" yKey="visitas" />
    </div>
  );
}
