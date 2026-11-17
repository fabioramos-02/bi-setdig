"use client";

import { useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { Select } from "@/components/dashboard/Select";
import {
  filtrarCatalogo,
  rankingResponsabilidade,
  situacaoCriticidade,
  textoBusca,
  type DadosInventario,
  type SituacaoCriticidade,
  type Sistema,
} from "@/lib/inventario-sistemas";
import { corTexto } from "./Comuns";

const SITUACAO: Record<SituacaoCriticidade, string> = {
  avaliado: "Avaliada",
  "em-andamento": "Em andamento",
  pendente: "Pendente",
};

/** Catálogo: busca por nome, sigla ou órgão, filtros e ficha de cada sistema. */
export function CatalogoTab({ dados, onAbrir }: { dados: DadosInventario; onAbrir: (id: string) => void }) {
  const [orgao, setOrgao] = useState("");
  const [situacao, setSituacao] = useState<SituacaoCriticidade | "">("");
  const [uso, setUso] = useState<"compartilhado" | "exclusivo" | "">("");
  const linhas = filtrarCatalogo(dados.sistemas, { orgao, situacao, uso });
  const orgaos = rankingResponsabilidade(dados.sistemas).map((o) => o.sigla).sort();

  const colunas: Coluna<Sistema>[] = [
    {
      key: "nome",
      label: "Sistema",
      sortable: true,
      sortValue: (s) => s.nome,
      render: (s) => (
        <div className="min-w-[12rem]">
          <div style={{ color: corTexto.primario }}>{s.nome}</div>
          {s.sigla && <div className="bi-caption" style={{ color: corTexto.apoio }}>{s.sigla}</div>}
        </div>
      ),
    },
    { key: "orgao", label: "Órgão responsável", sortable: true, sortValue: (s) => s.orgaoResponsavel, render: (s) => s.orgaoResponsavel },
    { key: "gestor", label: "Gestor", render: (s) => s.gestor ?? <span style={{ color: corTexto.apoio }}>Não informado</span> },
    { key: "uso", label: "Outros órgãos que usam", align: "right", sortable: true, sortValue: (s) => s.nOrgaosQueUsam, render: (s) => s.nOrgaosQueUsam },
    {
      key: "crit",
      label: "Criticidade",
      sortable: true,
      sortValue: (s) => s.pct ?? -1,
      render: (s) => (s.criticidade ? `${s.criticidade.rotulo} (${s.pct}%)` : <span style={{ color: corTexto.apoio }}>{SITUACAO[situacaoCriticidade(s)]}</span>),
    },
  ];

  const csv = linhas.map((s) => ({
    Sistema: s.nome,
    Sigla: s.sigla ?? "",
    "Órgão responsável": s.orgaoResponsavel,
    Gestor: s.gestor ?? "",
    "Outros órgãos que usam": s.nOrgaosQueUsam,
    "Órgãos que usam": s.orgaosQueUsam.join(", "),
    Criticidade: s.criticidade ? `${s.criticidade.rotulo} (${s.pct}%)` : SITUACAO[situacaoCriticidade(s)],
  }));

  return (
    <DashboardSection title="Catálogo de sistemas" action={<ExportCsvButton rows={csv} filename="inventario-sistemas" />}>
      <div className="flex flex-wrap gap-4 mb-4">
        <Select label="Órgão responsável" value={orgao} onChange={setOrgao} opcoes={orgaos.map((o) => ({ value: o, label: o }))} todosLabel="Todos os órgãos" />
        <Select
          label="Uso"
          value={uso}
          onChange={(v) => setUso(v as typeof uso)}
          opcoes={[
            { value: "compartilhado", label: "Usado por outros órgãos" },
            { value: "exclusivo", label: "Só o órgão responsável" },
          ]}
          todosLabel="Todos"
        />
        <Select
          label="Criticidade"
          value={situacao}
          onChange={(v) => setSituacao(v as typeof situacao)}
          opcoes={Object.entries(SITUACAO).map(([value, label]) => ({ value, label }))}
          todosLabel="Todas as situações"
        />
      </div>
      <DataTable
        columns={colunas}
        rows={linhas}
        rowKey={(s) => s.id}
        onRowClick={(s) => onAbrir(s.id)}
        searchText={textoBusca}
        pageSize={20}
        label="Sistemas"
      />
    </DashboardSection>
  );
}
