import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import type { ErroOrgao } from "@/lib/data";

const TOPO = 6;

/** "Quais órgãos concentram o que falta corrigir?" — em vez de listar todos os
 * órgãos (cansa e tira o foco), mostra só os que têm mais erros ainda pendentes.
 * O ranking completo e ordenável fica na seção "Análise por Órgão" logo abaixo.
 * Some quando um órgão já está selecionado no filtro lateral. */
export function PendenciasPorOrgao({ porOrgao }: { porOrgao: ErroOrgao[] }) {
  const comPendencia = porOrgao.filter((o) => o.pendentes > 0);
  if (comPendencia.length === 0) return null;

  const topo = [...comPendencia].sort((a, b) => b.pendentes - a.pendentes).slice(0, TOPO);
  const totalPendentes = comPendencia.reduce((s, o) => s + o.pendentes, 0);

  return (
    <DashboardSection title="Quais órgãos concentram o que falta corrigir?">
      <RankingBarChart
        itens={topo.map((o) => ({ label: o.orgaoSigla, valor: o.pendentes, sublabel: `de ${o.total.toLocaleString("pt-BR")} reportados` }))}
        cor="var(--ds-color-danger)"
      />
      <p className="mt-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
        São {totalPendentes.toLocaleString("pt-BR")} erros ainda aguardando correção. Os {topo.length} órgãos acima concentram a maior parte — comece por eles.
      </p>
    </DashboardSection>
  );
}
