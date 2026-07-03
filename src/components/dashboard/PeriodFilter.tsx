"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { PeriodRadioGroup } from "@/components/dashboard/PeriodRadioGroup";
import { aplicarFiltroPeriodo, type PeriodoState } from "@/lib/period-filter";
import type { VisitaDiaria } from "@/lib/data";

/**
 * Réplica da UX do app.py antigo: radio de período (Dia/Semana/Mês/Ano/
 * Intervalo) + campo(s) de data condicional — 1 campo se período fixo, 2
 * ("Data Início"/"Data Fim") se "Intervalo de datas". Agregação sempre
 * client-side sobre `dados` (já publicado pelo data-platform).
 */
export function PeriodFilter({ dados }: { dados: VisitaDiaria[] }) {
  const min = dados[0]?.data ?? "";
  const max = dados[dados.length - 1]?.data ?? "";
  const [estado, setEstado] = useState<PeriodoState>({ tipo: "mes", dataRef: max });
  const [inicio, setInicio] = useState(min);
  const [fim, setFim] = useState(max);

  const agregados = useMemo(
    () => aplicarFiltroPeriodo(dados, { ...estado, inicio, fim }),
    [dados, estado, inicio, fim]
  );

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 mb-4 print:hidden">
        <PeriodRadioGroup value={estado.tipo} onChange={(tipo) => setEstado((e) => ({ ...e, tipo }))} />

        {estado.tipo === "intervalo" ? (
          <>
            <label className="ds-field" style={{ maxWidth: 180 }}>
              <span className="ds-field__label">Data Início</span>
              <input
                className="ds-input"
                type="date"
                value={inicio}
                min={min}
                max={fim}
                onChange={(e) => setInicio(e.target.value)}
              />
            </label>
            <label className="ds-field" style={{ maxWidth: 180 }}>
              <span className="ds-field__label">Data Fim</span>
              <input
                className="ds-input"
                type="date"
                value={fim}
                min={inicio}
                max={max}
                onChange={(e) => setFim(e.target.value)}
              />
            </label>
          </>
        ) : (
          <label className="ds-field" style={{ maxWidth: 180 }}>
            <span className="ds-field__label">Data de referência</span>
            <input
              className="ds-input"
              type="date"
              value={estado.dataRef}
              min={min}
              max={max}
              onChange={(e) => setEstado((est) => ({ ...est, dataRef: e.target.value }))}
            />
          </label>
        )}

        <ExportCsvButton rows={agregados} filename="visitas-por-periodo" />
      </div>
      <LineChart data={agregados} xKey="rotulo" yKey="visitas" />
    </div>
  );
}
