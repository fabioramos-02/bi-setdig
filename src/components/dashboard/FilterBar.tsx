"use client";

import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import type { PeriodoState } from "@/lib/period-filter";

/**
 * Barra fixa no topo do conteúdo — sempre visível, controla os breakdowns
 * de toda a aba "Perfil do Cidadão" (navegadores/dispositivos/horários/mapa),
 * não só o gráfico de tendência.
 */
export function FilterBar({
  estado,
  onEstadoChange,
  min,
  max,
}: {
  estado: PeriodoState;
  onEstadoChange: (novo: PeriodoState) => void;
  min: string;
  max: string;
}) {
  return (
    <div
      style={{ background: "var(--ds-color-background)", borderBottom: "1px solid var(--ds-color-border)" }}
      className="sticky top-0 z-20 px-4 sm:px-6 py-3 print:hidden"
    >
      <PeriodFilter
        estado={estado}
        onEstadoChange={onEstadoChange}
        inicio={estado.inicio ?? min}
        fim={estado.fim ?? max}
        onIntervaloChange={(inicio, fim) => onEstadoChange({ ...estado, inicio, fim })}
        min={min}
        max={max}
      />
      {estado.tipo === "intervalo" && (
        <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-2">
          Navegadores, dispositivos, horários e mapa mostram o snapshot do mês atual — só o gráfico de tendência
          reflete o intervalo escolhido.
        </p>
      )}
    </div>
  );
}
