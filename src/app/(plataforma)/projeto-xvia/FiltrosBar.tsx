"use client";

import { Select } from "@/components/dashboard/Select";
import { ehEntrega, fmtNum, opcoesFiltro, type Filtros, type TfsItem } from "@/lib/tfs";
import type { Filtrar } from "./ProjetoXviaClient";

const ROTULO: Record<keyof Filtros, string> = { modulo: "Módulo", frente: "Frente", orgao: "Órgão", sprint: "Sprint" };
// Item na raiz da iteração ("XVIA") ainda não entrou em nenhuma sprint.
const nomeSprint = (s: string) => (s.includes("\\") ? s.split("\\").pop() ?? s : "Sem sprint");

export function descreverFiltros(f: Filtros): string {
  return (Object.keys(ROTULO) as (keyof Filtros)[])
    .filter((k) => f[k])
    .map((k) => `${ROTULO[k]}: ${k === "sprint" ? nomeSprint(f[k]) : f[k]}`)
    .join(" · ");
}

/** Recorte do painel. Vale para todas as abas e fica no endereço da página —
 * dá para mandar o link já filtrado. Os chips mostram o que está aplicado. */
export function FiltrosBar({
  itens,
  filtros,
  filtrar,
  limpar,
  total,
  dataRetrato,
}: {
  itens: TfsItem[];
  filtros: Filtros;
  filtrar: Filtrar;
  limpar: () => void;
  total: number;
  dataRetrato: string;
}) {
  const op = opcoesFiltro(itens);
  const ativos = (Object.keys(ROTULO) as (keyof Filtros)[]).filter((k) => filtros[k]);
  const entregas = itens.filter(ehEntrega).length;

  return (
    <section
      aria-label="Filtros do painel"
      className="mb-6 print:hidden"
      style={{
        border: "1px solid var(--ds-color-border)",
        borderRadius: "var(--ds-radius-md)",
        background: "var(--ds-color-background)",
        padding: "var(--ds-spacing-16, 16px)",
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Select label="Módulo" value={filtros.modulo} onChange={(v) => filtrar("modulo", v)} todosLabel="Todos os módulos" maxWidth={9999}
          opcoes={op.modulo.map((m) => ({ value: m, label: m }))} />
        <Select label="Frente" value={filtros.frente} onChange={(v) => filtrar("frente", v)} todosLabel="X-VIA e SGD" maxWidth={9999}
          opcoes={[{ value: "X-VIA", label: "X-VIA" }, { value: "SGD", label: "SGD" }]} />
        <Select label="Órgão" value={filtros.orgao} onChange={(v) => filtrar("orgao", v)} todosLabel="Todos os órgãos" maxWidth={9999}
          opcoes={op.orgao.map((o) => ({ value: o, label: o }))} />
        <Select label="Sprint" value={filtros.sprint} onChange={(v) => filtrar("sprint", v)} todosLabel="Todas as sprints" maxWidth={9999}
          opcoes={op.sprint.map((s) => ({ value: s, label: nomeSprint(s) }))} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
        {ativos.length === 0 ? (
          <span style={{ color: "var(--ds-color-text-secondary)" }}>
            Mostrando o projeto inteiro — {fmtNum(entregas)} entregas, retrato do TFS em {dataRetrato}. Clique numa barra ou linha para filtrar.
          </span>
        ) : (
          <>
            <span style={{ color: "var(--ds-color-text-secondary)" }}>Mostrando {fmtNum(total)} itens de</span>
            {ativos.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => filtrar(k, "")}
                aria-label={`Remover filtro ${ROTULO[k]}`}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"
                style={{ background: "var(--ds-color-primary-600)", color: "var(--ds-color-text-inverse)" }}
              >
                {ROTULO[k]}: {k === "sprint" ? nomeSprint(filtros[k]) : filtros[k]}
                <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" onClick={limpar} className="underline text-sm" style={{ color: "var(--ds-color-primary-600)" }}>
              Limpar tudo
            </button>
          </>
        )}
      </div>
    </section>
  );
}
