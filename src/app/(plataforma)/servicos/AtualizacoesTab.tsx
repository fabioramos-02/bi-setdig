"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { EmptyCard } from "@/components/ds/EmptyCard";
import type { AtualizacaoAno, AtualizacaoOrgao } from "@/lib/data";

export type DadosAtualizacoes = {
  porAno: AtualizacaoAno[];
  porOrgao: AtualizacaoOrgao[];
  atualizadoEm: string | null;
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

function variacao(atual: number, anterior: number | undefined): string | undefined {
  if (!anterior) return undefined;
  const pct = Math.round((100 * (atual - anterior)) / anterior);
  return `${pct >= 0 ? "+" : ""}${pct}% em relação ao ano anterior`;
}

/** Histórico de atualizações das cartas ativas, geral e por órgão (pedido da
 * Ari para o relatório de gestão, 10/11/2026). Dado estático: sai do banco das
 * Cartas (VPN) e é publicado pelo pipeline em datasets/cartas/v1/atualizacoes-*. */
export function AtualizacoesTab({ dados }: { dados: DadosAtualizacoes }) {
  const anos = dados.porAno.map((a) => a.ano);
  const [ano, setAno] = useState(() => (anos.includes(2025) ? 2025 : anos[anos.length - 1]));

  const atual = dados.porAno.find((a) => a.ano === ano);
  const anterior = dados.porAno.find((a) => a.ano === ano - 1);
  const linhasOrgao = useMemo(() => dados.porOrgao.filter((o) => o.ano === ano), [dados.porOrgao, ano]);

  if (!atual) {
    return <EmptyCard message="O histórico de atualizações das cartas ainda não foi extraído do banco. Ele aparece aqui depois da próxima carga." />;
  }

  const serie = dados.porAno.map((a) => ({ ano: String(a.ano), edicoes: a.edicoes, revisoes: a.revisoes, etapas: a.etapas }));

  const colunas: Coluna<AtualizacaoOrgao>[] = [
    { key: "orgao", label: "Órgão", sortable: true, sortValue: (r) => r.orgaoSigla || r.orgao, render: (r) => <span title={r.orgao}>{r.orgaoSigla || r.orgao}</span> },
    { key: "ativas", label: "Cartas ativas", align: "right", sortable: true, sortValue: (r) => r.cartasAtivas, render: (r) => fmt(r.cartasAtivas) },
    { key: "alteradas", label: "Cartas alteradas", align: "right", sortable: true, sortValue: (r) => r.cartasAlteradas, render: (r) => `${fmt(r.cartasAlteradas)} (${r.percentAlteradas.toLocaleString("pt-BR")}%)` },
    { key: "revisadas", label: "Cartas revisadas", align: "right", sortable: true, sortValue: (r) => r.cartasRevisadas, render: (r) => fmt(r.cartasRevisadas) },
    { key: "alteracoes", label: "Alterações", align: "right", sortable: true, sortValue: (r) => r.alteracoes, render: (r) => fmt(r.alteracoes) },
  ];

  const csv = linhasOrgao.map((r) => ({
    ano: r.ano,
    orgao: r.orgao,
    sigla: r.orgaoSigla,
    cartas_ativas: r.cartasAtivas,
    cartas_alteradas: r.cartasAlteradas,
    percent_alteradas: r.percentAlteradas,
    cartas_revisadas: r.cartasRevisadas,
    alteracoes: r.alteracoes,
    edicoes: r.edicoes,
    revisoes: r.revisoes,
  }));

  const extraidoEm = dados.atualizadoEm ? new Date(dados.atualizadoEm).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ano">
        <span className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>Ano:</span>
        {anos.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAno(a)}
            aria-pressed={a === ano}
            className="px-3 py-1 text-sm font-medium"
            style={{
              borderRadius: "var(--ds-radius-md)",
              border: "1px solid var(--ds-color-border)",
              background: a === ano ? "var(--ds-color-primary-600)" : "var(--ds-color-background)",
              color: a === ano ? "#fff" : "var(--ds-color-text-primary)",
            }}
          >
            {a}
          </button>
        ))}
      </div>

      <StoryCard
        anchor={<>Em {ano}, <b>{fmt(atual.cartasAlteradas)}</b> cartas de serviço foram atualizadas, com <b>{fmt(atual.total)}</b> alterações aprovadas.</>}
        caption={anterior ? `Em ${ano - 1} foram ${fmt(anterior.cartasAlteradas)} cartas e ${fmt(anterior.total)} alterações.` : undefined}
        comoLer="Cada alteração aprovada no sistema das Cartas (criação, edição, revisão ou mudança de etapa) conta uma vez. Uma carta alterada várias vezes no ano conta uma vez em “cartas alteradas”."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Cartas alteradas" value={atual.cartasAlteradas} sub={variacao(atual.cartasAlteradas, anterior?.cartasAlteradas)} />
        <MetricCard label="Alterações aprovadas" value={atual.total} sub={variacao(atual.total, anterior?.total)} />
        <MetricCard label="Cartas revisadas" value={atual.cartasRevisadas} sub={variacao(atual.cartasRevisadas, anterior?.cartasRevisadas)} />
        <MetricCard label="Revisões" value={atual.revisoes} sub={`${fmt(atual.edicoes)} edições e ${fmt(atual.etapas)} mudanças de etapa`} />
      </div>

      <DashboardSection title="Alterações por tipo, ano a ano">
        <MultiLineChart
          data={serie}
          xKey="ano"
          series={[
            { key: "edicoes", label: "Edições" },
            { key: "revisoes", label: "Revisões" },
            { key: "etapas", label: "Mudanças de etapa" },
          ]}
          height={260}
        />
      </DashboardSection>

      <DashboardSection title={`Por órgão em ${ano}`} action={<ExportCsvButton rows={csv} filename={`atualizacoes-cartas-por-orgao-${ano}.csv`} />}>
        <div className="overflow-x-auto min-w-0">
          <div className="min-w-[560px]">
            <DataTable columns={colunas} rows={linhasOrgao} rowKey={(r) => r.orgao} />
          </div>
        </div>
      </DashboardSection>

      <DashboardSection title="De onde vêm os dados">
        <ul className="list-disc pl-5 text-sm flex flex-col gap-1" style={{ color: "var(--ds-color-text-secondary)" }}>
          <li>Sistema de Gestão de Cartas de Serviço (Portal/Admin), banco <code>admin_prd</code>.</li>
          <li>Tabela <code>gerenciamento_historicoservico</code>: cada criação, edição, revisão ou mudança de etapa aprovada gera um registro com data e versão.</li>
          <li>Entram só as cartas ativas no Portal e só as alterações aprovadas. Pendentes e recusadas não chegaram ao cidadão.</li>
          <li>Histórico disponível desde abril de 2023; o ano corrente vai até a data da extração. Extração de {extraidoEm}.</li>
        </ul>
      </DashboardSection>
    </div>
  );
}
