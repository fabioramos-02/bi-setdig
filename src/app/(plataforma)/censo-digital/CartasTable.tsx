"use client";

import { useMemo, useState } from "react";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { NIVEIS, NIVEIS_DIGITAIS, quadranteDe, rotuloDoNivel, type LinhaCensal, type Quadrante } from "@/lib/censo";
import { NivelBadge } from "./NivelBadge";

/** Tabela operacional de cartas de um órgão: onde cada serviço está na escala
 * 0–5, o que ainda é presencial e quanta demanda tem. Filtro por faixa (chips,
 * incluindo "não informado") + busca livre. Prioriza os níveis 1–2 no texto —
 * são os que podem virar digitais. */
const NOME_QUADRANTE: Record<Quadrante, string> = {
  rapido: "Alto impacto, baixo esforço",
  estruturante: "Alto impacto, alto esforço",
  oportuno: "Baixo impacto, baixo esforço",
  evitar: "Baixo impacto, alto esforço",
};

export function CartasTable({ cartas, orgaoSigla, mediana }: { cartas: LinhaCensal[]; orgaoSigla: string; mediana: number }) {
  // undefined = todos; null = só os sem grau informado
  const [nivelFiltro, setNivelFiltro] = useState<number | null | undefined>(undefined);
  const [busca, setBusca] = useState("");

  const contagem = useMemo(() => {
    const m = new Map<number | null, number>();
    for (const c of cartas) m.set(c.nivel, (m.get(c.nivel) ?? 0) + 1);
    return m;
  }, [cartas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cartas.filter((c) => {
      if (nivelFiltro !== undefined && c.nivel !== nivelFiltro) return false;
      if (q && !`${c.titulo} ${c.setor ?? ""} ${c.etapaPresencial ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cartas, nivelFiltro, busca]);

  // exporta o que está na tela (respeita chips e busca)
  const linhasCsv = useMemo(() => filtradas.map((c) => {
    const q = quadranteDe(c, mediana);
    return {
      "Órgão": orgaoSigla,
      "Nível": c.nivel ?? "",
      "Grau de digitalização": rotuloDoNivel(c.nivel),
      "Serviço": c.titulo,
      "Setor": c.setor ?? "",
      "O que ainda é presencial": c.etapaPresencial ?? "",
      "Pedidos por mês": c.demandaMensal ?? "",
      "Pedidos (texto informado)": c.demandaTexto ?? "",
      "Matriz impacto × esforço": q ? NOME_QUADRANTE[q] : "Fora da matriz",
      "Link": c.urlServico ?? "",
    };
  }), [filtradas, orgaoSigla, mediana]);

  const colunas = useMemo<Coluna<LinhaCensal>[]>(() => [
    {
      key: "nivel", label: "Nível", sortable: true, sortValue: (c) => c.nivel ?? -1,
      render: (c) => <NivelBadge nivel={c.nivel} compacto />,
    },
    {
      key: "carta", label: "Carta de serviço", sortable: true, sortValue: (c) => c.titulo,
      render: (c) => (
        <div className="min-w-0">
          <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>{c.titulo}</span>
          {c.setor && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--ds-color-text-muted)" }} title={c.setor}>
              {c.setor}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "etapa", label: "O que ainda é presencial",
      render: (c) => (
        <span className="text-xs line-clamp-3" style={{ color: "var(--ds-color-text-secondary)" }} title={c.etapaPresencial ?? undefined}>
          {c.etapaPresencial || (c.nivel !== null && NIVEIS_DIGITAIS.includes(c.nivel) ? "Nada — já é 100% online" : "—")}
        </span>
      ),
    },
    {
      key: "demanda", label: "Pedidos por mês", align: "right", sortable: true, sortValue: (c) => c.demandaMensal ?? -1,
      render: (c) => (
        c.demandaMensal !== null ? (
          <span className="text-sm font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
            {c.demandaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--ds-color-text-muted)" }} title={c.demandaTexto ?? undefined}>
            {c.demandaTexto ? "sem número" : "não informado"}
          </span>
        )
      ),
    },
    {
      key: "portal", label: "Portal", align: "center",
      render: (c) => (
        c.urlServico ? (
          <a
            href={c.urlServico} target="_blank" rel="noopener noreferrer"
            className="text-[var(--ds-color-primary-600)] hover:underline inline-flex items-center justify-center"
            title="Abrir serviço no portal" aria-label="Abrir serviço no portal"
          >
            <span className="material-icons text-lg" aria-hidden>open_in_new</span>
          </a>
        ) : <span style={{ color: "var(--ds-color-text-muted)" }}>—</span>
      ),
    },
  ], []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar serviço, setor ou etapa…"
        className="w-full min-w-0 flex-1 rounded-md px-3 py-2 text-sm"
        style={{ border: "1px solid var(--ds-color-border)", background: "var(--ds-color-background)", color: "var(--ds-color-text-primary)" }}
      />
        <div className="shrink-0">
          <ExportCsvButton rows={linhasCsv} filename={`censo-${orgaoSigla.toLowerCase()}`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip ativo={nivelFiltro === undefined} onClick={() => setNivelFiltro(undefined)}>
          Todos ({cartas.length})
        </Chip>
        {NIVEIS.map((n) => (
          <Chip key={n.nivel} ativo={nivelFiltro === n.nivel} cor={n.cor} onClick={() => setNivelFiltro(nivelFiltro === n.nivel ? undefined : n.nivel)}>
            N{n.nivel} ({contagem.get(n.nivel) ?? 0})
          </Chip>
        ))}
        {(contagem.get(null) ?? 0) > 0 && (
          <Chip ativo={nivelFiltro === null} cor="var(--ds-color-neutral-400)" onClick={() => setNivelFiltro(nivelFiltro === null ? undefined : null)}>
            Não informado ({contagem.get(null)})
          </Chip>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
        Mostrando {filtradas.length.toLocaleString("pt-BR")} de {cartas.length.toLocaleString("pt-BR")} cartas.
        Comece pelos níveis 1 e 2 com mais pedidos por mês — podem virar digitais.
      </p>

      <div className="overflow-x-auto">
        <DataTable columns={colunas} rows={filtradas} rowKey={(c) => c.id} />
      </div>
    </div>
  );
}

function Chip({ ativo, cor, onClick, children }: { ativo: boolean; cor?: string; onClick: () => void; children: React.ReactNode }) {
  const c = cor ?? "var(--ds-color-primary-600)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
      style={{
        color: ativo ? "var(--ds-color-text-inverse)" : c,
        background: ativo ? c : `color-mix(in srgb, ${c} 12%, transparent)`,
        border: `1px solid ${ativo ? c : "transparent"}`,
      }}
    >
      {children}
    </button>
  );
}
