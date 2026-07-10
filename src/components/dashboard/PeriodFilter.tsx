"use client";

import { PeriodRadioGroup } from "@/components/dashboard/PeriodRadioGroup";
import type { PeriodoState } from "@/lib/period-filter";

/**
 * Réplica da UX do app.py antigo: radio de período (Dia/Semana/Mês/Ano/
 * Intervalo) + campo(s) de data condicional — 1 campo se período fixo, 2
 * ("Data Início"/"Data Fim") se "Intervalo de datas". Controlado — estado
 * vive no PeriodoProvider (context), consumido por SidebarPeriodFilter e
 * pelos gráficos do conteúdo.
 */
export function PeriodFilter({
  estado,
  onEstadoChange,
  inicio,
  fim,
  onIntervaloChange,
  min,
  max,
  vertical = false,
}: {
  estado: PeriodoState;
  onEstadoChange: (novo: PeriodoState) => void;
  inicio: string;
  fim: string;
  onIntervaloChange: (inicio: string, fim: string) => void;
  min: string;
  max: string;
  /** Empilhado (sidebar) em vez de em linha (barra horizontal). */
  vertical?: boolean;
}) {
  return (
    <div className={vertical ? "flex flex-col gap-3" : "flex flex-wrap items-end gap-4"}>
      <PeriodRadioGroup
        value={estado.tipo}
        onChange={(tipo) =>
          onEstadoChange({
            ...estado,
            tipo,
            // Selecionar "Intervalo" já grava inicio/fim reais no estado (não só
            // o valor visual do input) — senão o filtro parece preenchido mas
            // `estado.inicio`/`estado.fim` ficam undefined até o usuário mexer
            // manualmente numa data, e a busca ao vivo (ADR-010) nunca dispara.
            ...(tipo === "intervalo" ? { inicio: estado.inicio ?? min, fim: estado.fim ?? max } : {}),
          })
        }
        vertical={vertical}
      />

      {estado.tipo === "intervalo" ? (
        <>
          <label className="ds-field" style={{ maxWidth: vertical ? undefined : 180 }}>
            <span className="ds-field__label">Data Início</span>
            <input
              className="ds-input"
              type="date"
              value={inicio}
              min={min}
              max={fim}
              onChange={(e) => onIntervaloChange(e.target.value, fim)}
            />
          </label>
          <label className="ds-field" style={{ maxWidth: vertical ? undefined : 180 }}>
            <span className="ds-field__label">Data Fim</span>
            <input
              className="ds-input"
              type="date"
              value={fim}
              min={inicio}
              max={max}
              onChange={(e) => onIntervaloChange(inicio, e.target.value)}
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
            onChange={(e) => onEstadoChange({ ...estado, dataRef: e.target.value })}
          />
        </label>
      )}
    </div>
  );
}
