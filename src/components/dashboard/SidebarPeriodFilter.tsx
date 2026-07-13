"use client";

import { usePathname } from "next/navigation";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { usePeriodo } from "@/lib/periodo-context";

const ROTAS_COM_FILTRO = ["/analytics/portal-ms", "/analytics/ms-digital"];

// Texto curto e genérico de propósito: o detalhe de QUAIS painéis caem no
// snapshot do mês fica no aviso de cada aba (AvisoSnapshotAproximado) — uma
// lista aqui desatualiza toda vez que um dataset novo vira breakdown por
// período (já aconteceu: esta lista chegou a ficar incompleta e um par de
// abas chegou a rotular o dado errado como "do intervalo").
const AVISO_INTERVALO = "Alguns painéis mostram o snapshot mais recente do mês nesse modo — veja o aviso na aba específica.";

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
      <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-2">
        A granularidade (Dia/Semana/Mês/Ano) troca o recorte de todos os gráficos.
        A data de referência move só a tendência e os KPIs do topo — os gráficos de
        categoria mostram sempre o dia/semana/mês/ano mais recente.
      </p>
      {estado.tipo === "intervalo" && (
        <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-2">
          {AVISO_INTERVALO}
        </p>
      )}
    </div>
  );
}
