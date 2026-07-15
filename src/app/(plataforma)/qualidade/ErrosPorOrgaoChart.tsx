import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import type { ErroOrgao } from "@/lib/data";

/** "🏢 Erros por Órgão" — visão geral, sempre todos os órgãos (não reage ao
 * filtro lateral): responde "qual órgão tem mais erro, e quanto já foi
 * corrigido?" de relance, antes de qualquer filtro. */
export function ErrosPorOrgaoChart({ porOrgao }: { porOrgao: ErroOrgao[] }) {
  return (
    <DashboardSection title="🏢 Erros por Órgão">
      <div className="flex items-center gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--ds-color-success)" }} />
          <span style={{ color: "var(--ds-color-text-secondary)" }}>Atendidos</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--ds-color-danger)" }} />
          <span style={{ color: "var(--ds-color-text-secondary)" }}>Pendentes</span>
        </span>
      </div>
      <div className="max-h-[420px] overflow-y-auto pr-1">
        <StackedBarChart
          itens={porOrgao.map((o) => ({ label: o.orgaoSigla, atendidos: o.atendidos, pendentes: o.pendentes }))}
        />
      </div>
    </DashboardSection>
  );
}
