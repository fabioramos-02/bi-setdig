"use client";

import { useState } from "react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { execucaoXvia, fmtNum, fmtReais, linkTfs, type EtpUst, type LinhaCodigo, type TfsContrato, type TfsItem } from "@/lib/tfs";

const linkTarefa = (r: TfsItem) => (
  <a href={linkTfs(r.id)} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>
    #{r.id} {r.titulo}
  </a>
);

const colunasCodigo: Coluna<LinhaCodigo>[] = [
  { key: "codigo", label: "Código", sortable: true, sortValue: (r) => r.codigo, render: (r) => <span title={r.servico} className="font-medium">{r.codigo}</span> },
  { key: "servico", label: "Atividade", render: (r) => r.servico },
  { key: "unit", label: "UST por tarefa", align: "right", sortable: true, sortValue: (r) => r.ustUnitaria, render: (r) => fmtNum(r.ustUnitaria) },
  { key: "previsto", label: "Previsto no ETP", align: "right", sortable: true, sortValue: (r) => r.previsto, render: (r) => fmtNum(r.previsto) },
  { key: "tarefas", label: "Tarefas", align: "right", sortable: true, sortValue: (r) => r.tarefas, render: (r) => fmtNum(r.tarefas) },
  { key: "lancada", label: "UST lançada", align: "right", sortable: true, sortValue: (r) => r.lancada, render: (r) => fmtNum(r.lancada) },
  { key: "executada", label: "UST executada", align: "right", sortable: true, sortValue: (r) => r.executada, render: (r) => fmtNum(r.executada) },
  {
    key: "uso", label: "Uso do previsto", align: "right", sortable: true,
    sortValue: (r) => (r.previsto ? r.lancada / r.previsto : 0),
    render: (r) => {
      const pct = r.previsto ? Math.round((r.lancada / r.previsto) * 100) : 0;
      return <span style={{ color: pct > 100 ? "var(--ds-color-danger)" : "var(--ds-color-text-primary)", fontWeight: pct > 100 ? 600 : 400 }}>{pct}%</span>;
    },
  },
];

const colunasTarefa: Coluna<TfsItem & { situacao?: string }>[] = [
  { key: "titulo", label: "Tarefa", sortable: true, sortValue: (r) => r.titulo, render: linkTarefa },
  { key: "situacao", label: "Problema", sortable: true, sortValue: (r) => r.situacao ?? "", render: (r) => r.situacao ?? "—" },
  { key: "codigo", label: "Código escrito", render: (r) => r.codigoCatalogo ?? "—" },
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico ?? "", render: (r) => r.epico ?? "—" },
  { key: "estado", label: "Estado", sortable: true, sortValue: (r) => r.estado, render: (r) => r.estado },
];

/** UST da X-VIA × ETP: o que a X-VIA lançou nas tarefas que fatura (área
 * Customização UST), pelo código do catálogo escrito na descrição, comparado
 * ao previsto na memória de cálculo do ETP (pp. 68–71). Clique num código para
 * ver as tarefas dele. */
export function UstTab({ itens, etp, contrato }: { itens: TfsItem[]; etp: EtpUst | null; contrato: TfsContrato | null }) {
  const f = execucaoXvia(itens, etp, contrato);
  const [codigo, setCodigo] = useState<string | null>(null);
  const aberto = f.porCodigo.find((l) => l.codigo === codigo) ?? null;
  const usados = f.porCodigo.filter((l) => l.tarefas > 0);
  const estourados = usados.filter((l) => l.lancada > l.previsto);
  const reais = (v: number | null) => (v === null ? "valor da UST a informar" : fmtReais(v));

  if (f.tarefas === 0) {
    return <StoryCard anchor="Nenhuma tarefa da X-VIA (área de customização faturada) neste recorte." comoLer="A UST da X-VIA conta só tarefas na área Customização UST do TFS. Mude os filtros acima para ver outro recorte." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="UST executada" value={fmtNum(f.ustExecutada)} sub={`${f.pctExecutado ?? 0}% do ETP · ${reais(f.valorExecutado)}`} />
        <MetricCard label="UST lançada nas tarefas" value={fmtNum(f.ustLancada)} sub={`${f.pctLancado ?? 0}% do ETP · ${reais(f.valorLancado)}`} />
        <MetricCard label="Previsto no ETP" value={f.ustTotal === null ? "—" : `${fmtNum(f.ustTotal)} UST`} sub="memória de cálculo, pp. 68–71" />
        <MetricCard label="Tarefas a classificar" value={fmtNum(f.aClassificar.length)} sub={`de ${fmtNum(f.tarefas)} tarefas da X-VIA`} />
      </div>

      <StoryCard
        anchor={`A X-VIA lançou ${fmtNum(f.ustLancada)} UST em ${fmtNum(f.tarefas - f.aClassificar.length)} tarefas — ${f.pctLancado ?? 0}% das ${fmtNum(f.ustTotal ?? 0)} UST previstas no ETP. Concluídas, ${fmtNum(f.ustExecutada)}.`}
        caption={
          estourados.length > 0
            ? `${fmtNum(estourados.length)} atividade(s) já passaram do previsto no ETP: ${estourados.map((e) => e.codigo).join(", ")}.`
            : `${fmtNum(f.aClassificar.length)} tarefas ainda não têm um código do ETP e ficam fora da conta.`
        }
        comoLer="Cada tarefa vale a UST da atividade do ETP cujo código a X-VIA escreveu na descrição (ex.: 'Catálogo DOC.07'). Lançada = todas as tarefas com código; executada = só as concluídas. Previsto = ocorrências da memória de cálculo do ETP. Tarefas reabertas na revisão do backlog contam como não executadas até a X-VIA fechá-las."
      />

      <DashboardSection
        title="Quanto de cada atividade do ETP já foi usado?"
        action={<ExportCsvButton filename="projeto-xvia-ust-por-codigo.csv" rows={f.porCodigo.map((l) => ({ codigo: l.codigo, atividade: l.servico, ustPorTarefa: l.ustUnitaria, previstoEtp: l.previsto, tarefas: l.tarefas, ustLancada: l.lancada, ustExecutada: l.executada, saldo: l.saldo }))} />}
      >
        <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Clique numa linha para ver as tarefas daquela atividade. Atividades do ETP ainda sem nenhuma tarefa aparecem com zero.
        </p>
        <div className="overflow-x-auto min-w-0">
          <DataTable columns={colunasCodigo} rows={f.porCodigo} rowKey={(r) => r.codigo} onRowClick={(r) => setCodigo(r.codigo === codigo ? null : r.codigo)} />
        </div>
        {aberto && (
          <div className="mt-4 min-w-0">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--ds-color-text-primary)" }}>
              {aberto.codigo} · {aberto.servico} — {fmtNum(aberto.tarefas)} tarefas
            </h3>
            {aberto.itens.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>Nenhuma tarefa usa esta atividade ainda.</p>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <DataTable columns={colunasTarefa} rows={aberto.itens} rowKey={(r) => String(r.id)} />
              </div>
            )}
          </div>
        )}
      </DashboardSection>

      {f.aClassificar.length > 0 && (
        <DashboardSection
          title="Quais tarefas da X-VIA precisam de código do ETP?"
          action={<ExportCsvButton filename="projeto-xvia-tarefas-a-classificar.csv" rows={f.aClassificar.map((t) => ({ id: t.id, tarefa: t.titulo, problema: t.situacao, codigoEscrito: t.codigoCatalogo ?? "", modulo: t.epico ?? "", estado: t.estado, link: linkTfs(t.id) }))} />}
        >
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            {fmtNum(f.contagemAClassificar["sem código"])} sem código na descrição · {fmtNum(f.contagemAClassificar["faixa a definir"])} com faixa (ex.: NEG.03/04/05) a definir · {fmtNum(f.contagemAClassificar["fora do ETP"])} com código que não está na tabela do ETP. Lista para a X-VIA corrigir.
          </p>
          <div className="overflow-x-auto min-w-0">
            <DataTable columns={colunasTarefa} rows={f.aClassificar} rowKey={(r) => String(r.id)} />
          </div>
        </DashboardSection>
      )}
    </div>
  );
}
