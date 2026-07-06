"use client";

import { usePathname } from "next/navigation";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { usePeriodo } from "@/lib/periodo-context";

const ROTAS_COM_FILTRO = ["/analytics/portal-ms"];

/**
 * Filtro de período dentro da sidebar — só aparece nas rotas que têm gráficos
 * reativos a período (hoje, portal-ms). Layout vertical (empilhado), diferente
 * da barra horizontal de antes. Estado vem do PeriodoProvider (context).
 */
export function SidebarPeriodFilter() {
  const pathname = usePathname();
  const { estado, setEstado, min, max } = usePeriodo();

  if (!ROTAS_COM_FILTRO.includes(pathname)) return null;

  return (
    <div style={{ borderTop: "1px solid var(--ds-color-border)" }} className="px-4 py-4">
      <h2 style={{ color: "var(--ds-color-text-secondary)" }} className="text-xs font-semibold uppercase mb-3">
        Período
      </h2>
      <PeriodFilter
        estado={estado}
        onEstadoChange={setEstado}
        inicio={estado.inicio ?? min}
        fim={estado.fim ?? max}
        onIntervaloChange={(inicio, fim) => setEstado({ ...estado, inicio, fim })}
        min={min}
        max={max}
        vertical
      />
      {estado.tipo === "intervalo" && (
        <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-2">
          Mapa, navegadores, dispositivos e horários mostram o mês atual — só a tendência reflete o intervalo.
        </p>
      )}
    </div>
  );
}
