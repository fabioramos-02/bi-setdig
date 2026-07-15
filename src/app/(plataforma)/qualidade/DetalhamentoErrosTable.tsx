"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import type { ErroRelacao } from "@/lib/data";

const PASSO = 50;

const colunas: Coluna<ErroRelacao>[] = [
  { key: "orgao", label: "Órgão", sortable: true, sortValue: (e) => e.orgaoSigla, render: (e) => (
    <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>{e.orgaoSigla}</span>
  ) },
  { key: "servico", label: "Serviço", sortable: true, sortValue: (e) => e.servico, render: (e) => (
    <span style={{ color: "var(--ds-color-text-secondary)" }}>{e.servico}</span>
  ) },
  { key: "conteudo", label: "Erro relatado", render: (e) => (
    <span
      className="block max-w-[280px] truncate text-xs"
      style={{ color: "var(--ds-color-text-secondary)" }}
      title={e.conteudo ?? undefined}
    >
      {e.conteudo ?? "—"}
    </span>
  ) },
  { key: "status", label: "Status", sortable: true, sortValue: (e) => (e.atendido ? 1 : 0), render: (e) => (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded"
      style={{
        color: e.atendido ? "var(--ds-color-success)" : "var(--ds-color-danger)",
        background: e.atendido ? "color-mix(in srgb, var(--ds-color-success) 12%, transparent)" : "color-mix(in srgb, var(--ds-color-danger) 12%, transparent)",
      }}
    >
      {e.atendido ? "Atendido" : "Pendente"}
    </span>
  ) },
  { key: "diasAberto", label: "Dias em aberto", align: "right", sortable: true, sortValue: (e) => e.diasAberto, render: (e) => (
    <span className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>{e.diasAberto.toLocaleString("pt-BR")}</span>
  ) },
  { key: "resolucao", label: "Resolução", render: (e) => (
    <span
      className="block max-w-[220px] truncate text-xs"
      style={{ color: "var(--ds-color-text-muted)" }}
      title={e.resolucao ?? undefined}
    >
      {e.atendido ? (e.resolucao ?? "—") : "—"}
    </span>
  ) },
];

/** "📄 Detalhamento de Erros" — tabela operacional, 1 linha por erro (não
 * agregada). Reage ao filtro lateral de órgão. 708 erros é grande demais pra
 * renderizar tudo de uma vez — mesmo padrão de paginação de ExplorarTab.tsx. */
export function DetalhamentoErrosTable({ relacao, orgaoFiltro }: { relacao: ErroRelacao[]; orgaoFiltro: string }) {
  const [visiveis, setVisiveis] = useState(PASSO);

  useEffect(() => {
    setVisiveis(PASSO);
  }, [orgaoFiltro]);

  const filtrados = useMemo(
    () => (orgaoFiltro ? relacao.filter((e) => e.orgaoSigla === orgaoFiltro) : relacao),
    [relacao, orgaoFiltro],
  );
  const mostrando = filtrados.slice(0, visiveis);

  return (
    <DashboardSection title="📄 Detalhamento de Erros">
      <p className="mb-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
        {filtrados.length.toLocaleString("pt-BR")} erro{filtrados.length === 1 ? "" : "s"} · mostrando{" "}
        {mostrando.length.toLocaleString("pt-BR")}
      </p>
      <div className="overflow-x-auto">
        <DataTable columns={colunas} rows={mostrando} rowKey={(e) => e.id} />
      </div>
      {visiveis < filtrados.length && (
        <button
          type="button"
          onClick={() => setVisiveis((v) => v + PASSO)}
          className="mt-4 self-center text-sm font-medium rounded-md px-4 py-2 block mx-auto"
          style={{ color: "var(--ds-color-primary-600)", border: "1px solid var(--ds-color-border)" }}
        >
          Carregar mais ({(filtrados.length - visiveis).toLocaleString("pt-BR")} restantes)
        </button>
      )}
    </DashboardSection>
  );
}
