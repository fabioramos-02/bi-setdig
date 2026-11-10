"use client";

import { useState } from "react";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import {
  cadeiaMedicao,
  consumoPorOrgao,
  execucaoXvia,
  fmtNum,
  fmtReais,
  linkTfs,
  SEM_ORGAO,
  type EtpUst,
  type LinhaOrgao,
  type LinhaServico,
  type TfsContrato,
  type TfsItem,
} from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";

const NI = "Não informado";
const cinza = { color: "var(--ds-color-text-muted)" };
const reais = (v: number | null) => (v === null ? <span style={cinza}>{NI}</span> : fmtReais(v));

const colOrgao: Coluna<LinhaOrgao>[] = [
  { key: "orgao", label: "Órgão", sortable: true, sortValue: (r) => r.orgao, render: (r) => r.orgao },
  { key: "ust", label: "UST executadas", align: "right", sortable: true, sortValue: (r) => r.ustExecutada, render: (r) => fmtNum(r.ustExecutada) },
  { key: "aceitas", label: "UST aceitas", align: "right", render: () => <span style={cinza}>{NI}</span> },
  { key: "consumido", label: "Valor consumido", align: "right", sortable: true, sortValue: (r) => r.valorConsumido ?? 0, render: (r) => reais(r.valorConsumido) },
  { key: "faturado", label: "Faturado", align: "right", render: (r) => reais(r.valorFaturado) },
  { key: "pago", label: "Pago", align: "right", render: (r) => reais(r.valorPago) },
  { key: "pendente", label: "Pendente", align: "right", render: (r) => reais(r.pendente) },
];

const colServico: Coluna<LinhaServico>[] = [
  {
    key: "servico", label: "Serviço", sortable: true, sortValue: (r) => r.servico,
    render: (r) => r.pbiId ? (
      <a href={linkTfs(r.pbiId)} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>#{r.pbiId} {r.servico}</a>
    ) : r.servico,
  },
  { key: "previstas", label: "UST previstas", align: "right", render: () => <span style={cinza}>{NI}</span> },
  { key: "ust", label: "UST executadas", align: "right", sortable: true, sortValue: (r) => r.ustExecutada, render: (r) => fmtNum(r.ustExecutada) },
  { key: "consumido", label: "Valor consumido", align: "right", sortable: true, sortValue: (r) => r.valorConsumido ?? 0, render: (r) => reais(r.valorConsumido) },
  { key: "faturado", label: "Faturado", align: "right", render: () => <span style={cinza}>{NI}</span> },
  { key: "pago", label: "Pago", align: "right", render: () => <span style={cinza}>{NI}</span> },
  { key: "tarefas", label: "Tarefas", align: "right", render: (r) => <OrigemBotao origem={{ rotulo: `Tarefas de ${r.servico}`, detalhe: "Tarefas da X-VIA concluídas, com código do catálogo, neste serviço.", itens: r.tarefas }} /> },
];

/** Nível 2 — "Quanto estamos gastando por órgão e serviço?". Execução tem
 * fonte (TFS); aceite, faturamento e pagamento ainda não: aparecem como
 * "Não informado", nunca estimados a partir da execução. */
export function FinanceiroTab({ itens, etp, contrato }: { itens: TfsItem[]; etp: EtpUst | null; contrato: TfsContrato | null }) {
  const linhas = consumoPorOrgao(itens, etp, contrato);
  const total = execucaoXvia(itens, etp, contrato);
  const cadeia = cadeiaMedicao(itens);
  const [orgao, setOrgao] = useState<string | null>(null);
  const selecionado = linhas.find((l) => l.orgao === orgao) ?? null;
  const semOrgao = linhas.find((l) => l.orgao === SEM_ORGAO);

  const kpis: { label: string; valor: string | null; sub: string }[] = [
    { label: "UST previstas (TR)", valor: total.ustTotal ? fmtNum(total.ustTotal) : null, sub: "Item 3 do contrato; por serviço: não informado" },
    { label: "UST executadas", valor: fmtNum(total.ustExecutada), sub: "Tarefas da X-VIA concluídas" },
    { label: "UST aceitas", valor: null, sub: "Sem registro da fiscalização" },
    { label: "Valor consumido", valor: total.valorExecutado === null ? null : fmtReais(total.valorExecutado), sub: "UST executadas × R$ 154,61" },
    { label: "Valor faturado", valor: null, sub: "Campo Faturado vazio no TFS" },
    { label: "Valor pago", valor: null, sub: "Sem fonte de pagamentos" },
    { label: "Pendente (faturado − pago)", valor: null, sub: "Depende de faturado e pago" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`A X-VIA executou ${fmtNum(total.ustExecutada)} UST${total.valorExecutado !== null ? ` (${fmtReais(total.valorExecutado)})` : ""} em ${fmtNum(linhas.filter((l) => l.orgao !== SEM_ORGAO).length)} órgãos. Faturamento, aceite e pagamento ainda não têm fonte: aparecem como não informado.`}
        caption={semOrgao ? `${fmtNum(semOrgao.ustExecutada)} UST estão em tarefas sem órgão identificado (Feature sem sigla do órgão e campo Órgãos/Secretarias vazio).` : undefined}
        comoLer="Consumido, aceito, faturado e pago são etapas diferentes: uma tarefa concluída não significa UST aceita, faturada ou paga. Cada etapa só aparece quando houver fonte própria. Clique num órgão para ver os serviços dele."
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => (
          <div key={k.label} style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", padding: "12px", background: "var(--ds-color-background)" }}>
            <div className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>{k.label}</div>
            <div className="text-lg font-semibold" style={{ color: k.valor === null ? "var(--ds-color-text-muted)" : "var(--ds-color-primary-600)" }}>{k.valor ?? NI}</div>
            <div className="text-xs" style={cinza}>{k.sub}</div>
          </div>
        ))}
      </div>

      <DashboardSection title="Da Ordem de Serviço ao pagamento: o que já tem fonte?">
        <ol className="grid gap-2 grid-cols-1 md:grid-cols-5">
          {cadeia.map((c, n) => (
            <li key={c.etapa} className="text-sm" style={{ borderLeft: `4px solid ${c.fonte ? "var(--ds-color-success)" : "var(--ds-color-text-muted)"}`, paddingLeft: 8 }}>
              <b>{n + 1}. {c.etapa}</b>
              <div className="text-xs" style={{ color: c.fonte ? "var(--ds-color-text-secondary)" : "var(--ds-color-text-muted)" }}>
                {c.fonte ?? `Sem fonte — falta: ${c.falta}`}
              </div>
            </li>
          ))}
        </ol>
      </DashboardSection>

      <DashboardSection title="Quanto cada órgão consumiu?">
        <div className="overflow-x-auto min-w-0">
          <DataTable columns={colOrgao} rows={linhas} rowKey={(r) => r.orgao} onRowClick={(r) => setOrgao(r.orgao === orgao ? null : r.orgao)} />
        </div>
        <p className="mt-2 text-xs" style={cinza}>Clique num órgão para ver os serviços. As colunas de aceite, faturado, pago e pendente ficam vazias até existir fonte.</p>
      </DashboardSection>

      {selecionado && (
        <DashboardSection title={`Serviços de ${selecionado.orgao}`} action={<OrigemBotao origem={{ rotulo: `Tarefas de ${selecionado.orgao}`, detalhe: "Tarefas da X-VIA concluídas, com código do catálogo, ligadas ao órgão pela Feature ou pelo campo Órgãos/Secretarias.", itens: selecionado.tarefas }} />}>
          <div className="overflow-x-auto min-w-0">
            <DataTable columns={colServico} rows={selecionado.servicos} rowKey={(r) => String(r.pbiId ?? r.servico)} />
          </div>
        </DashboardSection>
      )}
    </div>
  );
}
