"use client";

import { usePathname } from "next/navigation";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { usePeriodo } from "@/lib/periodo-context";

const ROTAS_COM_FILTRO = ["/analytics/portal-ms", "/analytics/ms-digital"];

// Aviso do modo "intervalo" muda por rota: o Portal MS tem mapa/breakdowns que
// caem no mês; o MS Digital cai no snapshot do mês inteiro. As demais (vazias)
// não mostram o filtro.
const AVISO_INTERVALO: Record<string, string> = {
  "/analytics/portal-ms": "Mapa, navegadores, dispositivos e horários mostram o mês atual — só a tendência reflete o intervalo.",
  "/analytics/ms-digital": "Os painéis do app mostram o snapshot do mês quando há um intervalo selecionado.",
};

/**
 * Filtro de período dentro da sidebar — aparece nas rotas com dados reativos a
 * período (portal-ms e ms-digital). Layout vertical (empilhado). Estado vem do
 * PeriodoProvider (context), compartilhado com o conteúdo.
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
          {AVISO_INTERVALO[pathname]}
        </p>
      )}
    </div>
  );
}
