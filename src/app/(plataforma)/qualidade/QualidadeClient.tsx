"use client";

import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { BarChart } from "@/components/charts/BarChart";
import { calcularInsightQualidade, calcularInsightPercepcao } from "@/lib/insights";
import type { ErroResumo, ErroOrgao, ErroEvolucaoMensal, PercepcaoResumo } from "@/lib/data";

const NOTAS = ["1", "2", "3", "4", "5"] as const;

/** Retrato da qualidade das cartas de serviço — erros reportados pelo
 * cidadão, quem resolve mais devagar, e se o cidadão entende/gosta do
 * serviço (pergunta diferente de "funciona sem bug"). Sem filtro de período:
 * é estado + série histórica, não analytics de acesso ao vivo. */
export function QualidadeClient({
  resumo,
  porOrgao,
  evolucaoMensal,
  percepcao,
}: {
  resumo: ErroResumo;
  porOrgao: ErroOrgao[];
  evolucaoMensal: ErroEvolucaoMensal[];
  percepcao: PercepcaoResumo | null;
}) {
  const insightQualidade = calcularInsightQualidade(resumo);
  const insightPercepcao = calcularInsightPercepcao(percepcao);

  const colunas: Coluna<ErroOrgao>[] = [
    { key: "orgao", label: "Órgão", sortable: true, sortValue: (o) => o.orgaoSigla, render: (o) => (
      <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>{o.orgaoSigla}</span>
    ) },
    { key: "total", label: "Erros reportados", align: "right", sortable: true, sortValue: (o) => o.total, render: (o) => o.total.toLocaleString("pt-BR") },
    { key: "atendidos", label: "Corrigidos", align: "right", sortable: true, sortValue: (o) => o.atendidos, render: (o) => o.atendidos.toLocaleString("pt-BR") },
    { key: "pendentes", label: "Pendentes", align: "right", sortable: true, sortValue: (o) => o.pendentes, render: (o) => (
      <span className="font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>{o.pendentes.toLocaleString("pt-BR")}</span>
    ) },
    { key: "tempo", label: "Tempo médio de correção", align: "right", sortable: true, sortValue: (o) => o.tempoMedioResolucaoDias, render: (o) => (
      <span className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>{o.tempoMedioResolucaoDias.toLocaleString("pt-BR")} dias</span>
    ) },
  ];

  const csatData = percepcao
    ? NOTAS.map((n) => ({ nota: `${n} estrela${n === "1" ? "" : "s"}`, total: percepcao.csatDistribuicao[n] }))
    : [];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Qualidade" />
      <main className="flex-1 p-6 flex flex-col gap-6">
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

        <DashboardSection title="Erros por órgão">
          <div className="overflow-x-auto">
            <DataTable columns={colunas} rows={porOrgao} rowKey={(o) => o.orgaoSigla} />
          </div>
        </DashboardSection>

        {evolucaoMensal.length > 1 && (
          <DashboardSection title="Erros reportados e corrigidos, mês a mês">
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

        {percepcao && insightPercepcao && (
          <DashboardSection title="O que o cidadão acha do serviço">
            <BarChart data={csatData} xKey="nota" yKey="total" height={220} />
            <div className="mt-4">
              <StoryCard
                anchor={`Nota média do cidadão pro serviço: ${insightPercepcao.csatMedia.toLocaleString("pt-BR")} de 5, em ${insightPercepcao.totalVotos.toLocaleString("pt-BR")} avaliações.`}
                caption={`Em ${insightPercepcao.clarezaPositivaPct.toFixed(0)}% das vezes, o cidadão achou a descrição do serviço clara.`}
                comoLer="A nota mede se o cidadão gostou do atendimento; a clareza mede se ele entendeu a explicação do serviço antes de usar. São perguntas diferentes — um serviço pode funcionar bem e ainda assim ter uma descrição confusa."
              />
            </div>
          </DashboardSection>
        )}
      </main>
    </div>
  );
}
