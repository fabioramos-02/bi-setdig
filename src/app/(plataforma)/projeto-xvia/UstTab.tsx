"use client";

import { useEffect, useRef, useState } from "react";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { execucaoMensal, prazoProjeto, fmtData, fmtReais, execucaoXvia, fmtNum, linkTfs, type EtpUst, type LinhaCodigo, type TfsContrato, type TfsItem } from "@/lib/tfs";
import { ExecucaoMensal } from "./ExecucaoMensal";
import { LinkItem } from "./comum";
import { UstResumo } from "./UstResumo";

const linkTarefa = (r: TfsItem) => <LinkItem item={r} />;

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
    sortValue: (r) => (r.previsto ? r.lancada / r.previsto : -1),
    render: (r) => {
      // Atividade do catálogo da X-VIA sem previsão no ETP: não há base para o percentual.
      if (!r.previsto) return <span title="Atividade do catálogo da X-VIA sem previsão na memória de cálculo do ETP" style={{ color: "var(--ds-color-text-secondary)" }}>fora do ETP</span>;
      const pct = Math.round((r.lancada / r.previsto) * 100);
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

/** UST da X-VIA × ETP: o que a X-VIA lançou nas tarefas do contrato dela
 * (catálogo X-VIA; tarefa do contrato do Governo do Estado não entra),
 * comparado ao previsto na memória de cálculo do ETP (pp. 68–71). Regra em
 * lib/tfs.ts (execucaoXvia). Clique num código para ver as tarefas dele. */
export function UstTab({ itens, etp, contrato, mensal, hoje, prazo }: { itens: TfsItem[]; etp: EtpUst | null; contrato: TfsContrato | null; mensal: ReturnType<typeof execucaoMensal>; hoje: string; prazo: ReturnType<typeof prazoProjeto> }) {
  const f = execucaoXvia(itens, etp, contrato);
  const [codigo, setCodigo] = useState<string | null>(null);
  const detalheRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!codigo) return;
    const id = requestAnimationFrame(() => { detalheRef.current?.focus({ preventScroll: true }); detalheRef.current?.scrollIntoView({ block: "start" }); });
    return () => cancelAnimationFrame(id);
  }, [codigo]);
  const aberto = f.porCodigo.find((l) => l.codigo === codigo) ?? null;

  if (f.tarefas === 0) {
    return <StoryCard anchor="Nenhuma tarefa do contrato da X-VIA nos filtros aplicados." comoLer="A UST da X-VIA conta só as tarefas do contrato da X-VIA; as do contrato do Governo do Estado não entram. Mude os filtros acima para ver outro conjunto de registros." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <UstResumo f={f} />

      <DashboardSection title="Como a execução mensal se compara ao previsto?">
        <ExecucaoMensal dados={mensal} hoje={hoje} />
      </DashboardSection>
      <details className="text-sm"><summary className="cursor-pointer font-semibold">Consultar o contrato e a referência de UST</summary>
        <p className="mt-2">{contrato ? `${contrato.contrato} · ${fmtData(prazo.inicio)} a ${fmtData(prazo.fim)}.` : "Contrato não informado."} {contrato?.valorTotal != null && `Valor total: ${fmtReais(contrato.valorTotal)}.`} A previsão por atividade vem do Estudo Técnico Preliminar (ETP); UST significa Unidade de Serviço Técnico.</p>
      </details>

      <DashboardSection
        title="Quanto de cada atividade do ETP já foi usado?"
        action={<ExportCsvButton filename="projeto-xvia-ust-por-codigo.csv" rows={f.porCodigo.map((l) => ({ codigo: l.codigo, atividade: l.servico, ustPorTarefa: l.ustUnitaria, previstoEtp: l.previsto, tarefas: l.tarefas, ustLancada: l.lancada, ustExecutada: l.executada, saldo: l.saldo }))} />}
      >
        <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Clique numa linha para ver as tarefas daquela atividade. Atividades do ETP ainda sem nenhuma tarefa aparecem com zero.
        </p>
        <div className="overflow-x-auto min-w-0">
          <DataTable horizontalScroll pageSize={25} label="Atividades" searchText={(r) => [r.codigo, r.servico].join(" ")} columns={colunasCodigo} rows={f.porCodigo} rowKey={(r) => r.codigo} onRowClick={(r) => setCodigo(r.codigo === codigo ? null : r.codigo)} />
        </div>
        {aberto && (
          <div className="mt-4 min-w-0">
            <h3 ref={detalheRef} tabIndex={-1} className="text-sm font-semibold mb-2" style={{ color: "var(--ds-color-text-primary)" }}>
              {aberto.codigo} · {aberto.servico} — {fmtNum(aberto.tarefas)} tarefas
            </h3>
            {aberto.itens.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>Nenhuma tarefa usa esta atividade ainda.</p>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <DataTable horizontalScroll pageSize={25} label="Tarefas" searchText={(r) => [r.id, r.titulo, r.responsavel, r.epico, r.codigoCatalogo].join(" ")} columns={colunasTarefa} rows={aberto.itens} rowKey={(r) => String(r.id)} />
              </div>
            )}
          </div>
        )}
      </DashboardSection>

      {f.aClassificar.length > 0 && (
        <DashboardSection
          title="Quais tarefas da X-VIA precisam de código do catálogo?"
          action={<ExportCsvButton filename="projeto-xvia-tarefas-a-classificar.csv" rows={f.aClassificar.map((t) => ({ id: t.id, tarefa: t.titulo, problema: t.situacao, codigoEscrito: t.codigoCatalogo ?? "", modulo: t.epico ?? "", estado: t.estado, link: linkTfs(t.id) }))} />}
        >
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            {fmtNum(f.contagemAClassificar["sem código"])} sem código na descrição · {fmtNum(f.contagemAClassificar["faixa a definir"])} com faixa (ex.: NEG.03/04/05) a definir · {fmtNum(f.contagemAClassificar["fora do ETP"])} com código que não existe no catálogo da X-VIA. Lista para a X-VIA corrigir.
          </p>
          <div className="overflow-x-auto min-w-0">
            <DataTable horizontalScroll pageSize={25} label="Tarefas" searchText={(r) => [r.id, r.titulo, r.responsavel, r.epico, r.codigoCatalogo].join(" ")} columns={colunasTarefa} rows={f.aClassificar} rowKey={(r) => String(r.id)} />
          </div>
        </DashboardSection>
      )}
    </div>
  );
}
