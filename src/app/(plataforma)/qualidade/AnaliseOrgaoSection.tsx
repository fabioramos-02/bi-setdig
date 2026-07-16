"use client";

import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { calcularComparacaoOrgao } from "@/lib/insights";
import type { ErroOrgao, ErroResumo } from "@/lib/data";

const colunas: Coluna<ErroOrgao>[] = [
  {
    key: "orgao",
    label: "Órgão",
    sortable: true,
    sortValue: (o) => o.orgaoSigla,
    render: (o) => (
      <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>
        {o.orgaoSigla}
      </span>
    ),
  },
  { key: "total", label: "Erros reportados", align: "right", sortable: true, sortValue: (o) => o.total, render: (o) => o.total.toLocaleString("pt-BR") },
  { key: "atendidos", label: "Corrigidos", align: "right", sortable: true, sortValue: (o) => o.atendidos, render: (o) => o.atendidos.toLocaleString("pt-BR") },
  {
    key: "pendentes",
    label: "Pendentes",
    align: "right",
    sortable: true,
    sortValue: (o) => o.pendentes,
    render: (o) => (
      <span className="font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
        {o.pendentes.toLocaleString("pt-BR")}
      </span>
    ),
  },
  {
    key: "tempo",
    label: "Tempo médio de correção",
    align: "right",
    sortable: true,
    sortValue: (o) => o.tempoMedioResolucaoDias,
    render: (o) => (
      <span className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
        {o.tempoMedioResolucaoDias.toLocaleString("pt-BR")} dias
      </span>
    ),
  },
];

/** "🏛️ Análise por Órgão" — reage ao filtro lateral. Sem órgão selecionado:
 * ranking sortável de todos. Com órgão selecionado: números daquele órgão +
 * comparação com a média geral (não a média das médias — usa o resumo geral,
 * que já é ponderado pelo total real de erros). */
export function AnaliseOrgaoSection({
  porOrgao,
  resumo,
  orgaoFiltro,
}: {
  porOrgao: ErroOrgao[];
  resumo: ErroResumo;
  orgaoFiltro: string;
}) {
  const orgaoSelecionado = orgaoFiltro ? porOrgao.find((o) => o.orgaoSigla === orgaoFiltro) : null;

  if (orgaoFiltro && orgaoSelecionado) {
    const comparacao = calcularComparacaoOrgao(orgaoSelecionado, resumo);
    const maisLento = comparacao.diferencaDias > 0;
    return (
      <DashboardSection title="🏛️ Análise por Órgão">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <MetricCard label="Erros reportados" value={orgaoSelecionado.total} />
          <MetricCard label="Corrigidos" value={orgaoSelecionado.atendidos} sub={`${orgaoSelecionado.percentAtendido.toFixed(0)}% do total`} />
          <MetricCard label="Pendentes" value={orgaoSelecionado.pendentes} />
          <MetricCard label="Tempo médio de correção" value={`${orgaoSelecionado.tempoMedioResolucaoDias.toLocaleString("pt-BR")} dias`} />
        </div>
        <StoryCard
          anchor={`${orgaoSelecionado.orgaoSigla} demora ${Math.abs(comparacao.diferencaDias).toLocaleString("pt-BR")} dias ${maisLento ? "a mais" : "a menos"} que a média geral pra corrigir um erro.`}
          caption={`Média geral: ${comparacao.tempoMedioGeral.toLocaleString("pt-BR")} dias.`}
          comoLer="Comparamos o tempo médio de correção desse órgão com a média de todos os órgãos juntos — não a média simples entre órgãos, mas o cálculo sobre o total real de erros corrigidos."
        />
      </DashboardSection>
    );
  }

  // Sem órgão escolhido: a tabela dos ~37 órgãos é longa e o destaque (top
  // pendências) já aparece acima — deixa recolhida, a um clique.
  return (
    <DashboardSection title="🏛️ Análise por Órgão">
      <details>
        <summary
          className="cursor-pointer select-none text-sm font-medium"
          style={{ color: "var(--ds-color-primary-600)" }}
        >
          Ver comparação completa entre órgãos ({porOrgao.length})
        </summary>
        <div className="overflow-x-auto mt-4">
          <DataTable columns={colunas} rows={porOrgao} rowKey={(o) => o.orgaoSigla} />
        </div>
      </details>
    </DashboardSection>
  );
}
