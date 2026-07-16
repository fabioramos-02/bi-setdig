"use client";

import { useMemo, useState } from "react";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { NIVEIS, type LinhaCensal } from "@/lib/censo";
import { NivelBadge } from "./NivelBadge";

/** Tabela operacional de cartas de um órgão: onde cada serviço está na régua
 * 0–4 e o que trava. Filtro por faixa (chips) + busca livre. Prioriza os
 * níveis 2–3 no texto — são os que estão a um passo de ficar 100% online. */
export function CartasTable({ cartas }: { cartas: LinhaCensal[] }) {
  const [nivelFiltro, setNivelFiltro] = useState<number | null>(null);
  const [busca, setBusca] = useState("");

  const contagem = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of cartas) m.set(c.nivel, (m.get(c.nivel) ?? 0) + 1);
    return m;
  }, [cartas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cartas.filter((c) => {
      if (nivelFiltro !== null && c.nivel !== nivelFiltro) return false;
      if (q && !`${c.titulo} ${c.nomePopular} ${c.sistemaCitado} ${c.etapaBloqueio}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cartas, nivelFiltro, busca]);

  const colunas = useMemo<Coluna<LinhaCensal>[]>(() => [
    {
      key: "nivel", label: "Nível", sortable: true, sortValue: (c) => c.nivel,
      render: (c) => <NivelBadge nivel={c.nivel} compacto />,
    },
    {
      key: "carta", label: "Carta de serviço", sortable: true, sortValue: (c) => c.titulo,
      render: (c) => (
        <div className="min-w-0">
          <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>{c.titulo || c.nomePopular || "—"}</span>
          {c.justificativa && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--ds-color-text-muted)" }} title={c.justificativa}>
              {c.justificativa}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "etapa", label: "O que ainda trava",
      render: (c) => (
        <span className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
          {c.etapaBloqueio || (c.nivel === 4 ? "Nada — já é 100% online" : "—")}
        </span>
      ),
    },
    {
      key: "sistema", label: "Sistema", align: "center", sortable: true, sortValue: (c) => (c.falaSistema ? 1 : 0),
      render: (c) => (
        <span className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }} title={c.sistemaCitado}>
          {c.sistemaCitado || (c.falaSistema ? "Sim" : "—")}
        </span>
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
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar serviço, sistema ou etapa…"
        className="w-full rounded-md px-3 py-2 text-sm"
        style={{ border: "1px solid var(--ds-color-border)", background: "var(--ds-color-background)", color: "var(--ds-color-text-primary)" }}
      />

      <div className="flex flex-wrap gap-2">
        <Chip ativo={nivelFiltro === null} onClick={() => setNivelFiltro(null)}>
          Todos ({cartas.length})
        </Chip>
        {NIVEIS.map((n) => (
          <Chip key={n.nivel} ativo={nivelFiltro === n.nivel} cor={n.cor} onClick={() => setNivelFiltro(nivelFiltro === n.nivel ? null : n.nivel)}>
            N{n.nivel} ({contagem.get(n.nivel) ?? 0})
          </Chip>
        ))}
      </div>

      <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
        Mostrando {filtradas.length.toLocaleString("pt-BR")} de {cartas.length.toLocaleString("pt-BR")} cartas.
        Comece pelos níveis 2 e 3 — estão a um passo de ficar 100% online.
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
