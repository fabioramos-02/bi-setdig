import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { calcularInsightQualidade } from "@/lib/insights";
import { ErrosPorOrgaoChart } from "./ErrosPorOrgaoChart";
import { AnaliseOrgaoSection } from "./AnaliseOrgaoSection";
import { DetalhamentoErrosTable } from "./DetalhamentoErrosTable";
import type { ErroResumo, ErroOrgao, ErroEvolucaoMensal, ErroRelacao } from "@/lib/data";

/** Aba "Erros": quantos, de quais órgãos, evolução no tempo, e o
 * detalhamento operacional. O filtro de órgão do menu lateral afeta Análise
 * por Órgão e Detalhamento; Evolução Mensal continua sempre com todos.
 * "Erros por Órgão" some quando filtrado — visão geral de todos os órgãos
 * não faz sentido com 1 órgão já selecionado, Análise por Órgão cobre esse
 * caso. */
export function ErrosTab({
  resumo,
  porOrgao,
  evolucaoMensal,
  relacao,
  orgaoFiltro,
}: {
  resumo: ErroResumo;
  porOrgao: ErroOrgao[];
  evolucaoMensal: ErroEvolucaoMensal[];
  relacao: ErroRelacao[];
  orgaoFiltro: string;
}) {
  const insightQualidade = calcularInsightQualidade(resumo);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Erros reportados" value={resumo.total} />
        <MetricCard label="Já corrigidos" value={resumo.atendidos} sub={`${resumo.percentAtendido.toFixed(0)}% do total`} />
        <MetricCard label="Ainda pendentes" value={resumo.pendentes} sub={`${(100 - resumo.percentAtendido).toFixed(0)}% do total`} />
        <MetricCard label="Tempo médio até a correção" value={`${resumo.tempoMedioResolucaoDias.toLocaleString("pt-BR")} dias`} />
      </div>

      {insightQualidade && (
        <StoryCard
          anchor={`${insightQualidade.percentAtendido.toFixed(0)}% dos erros reportados nas cartas de serviço já foram corrigidos, em média ${insightQualidade.tempoMedioResolucaoDias.toLocaleString("pt-BR")} dias depois do reporte.`}
          caption={`${insightQualidade.pendentes.toLocaleString("pt-BR")} erros ainda aguardam correção.`}
          comoLer="O tempo de correção é uma aproximação — contamos os dias entre o reporte do cidadão e a última atualização do caso, porque nem todo erro registra o momento exato em que foi resolvido."
        />
      )}

      {!orgaoFiltro && <ErrosPorOrgaoChart porOrgao={porOrgao} />}

      <AnaliseOrgaoSection porOrgao={porOrgao} resumo={resumo} orgaoFiltro={orgaoFiltro} />

      {evolucaoMensal.length > 1 && (
        <DashboardSection title="Evolução Mensal de Erros">
          <MultiLineChart
            data={evolucaoMensal}
            xKey="mes"
            series={[
              { key: "abertos", label: "Erros reportados" },
              { key: "resolvidos", label: "Erros corrigidos" },
            ]}
          />
        </DashboardSection>
      )}

      <DetalhamentoErrosTable relacao={relacao} orgaoFiltro={orgaoFiltro} />
    </div>
  );
}
