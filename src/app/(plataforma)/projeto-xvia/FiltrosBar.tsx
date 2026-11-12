"use client";

import { Select } from "@/components/dashboard/Select";
import { fmtNum, FRENTES, opcoesFiltro, type Filtros, type TfsItem } from "@/lib/tfs";
import styles from "./projeto-xvia.module.css";
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

  return <section aria-label="Filtros do painel" className={`${styles.filtros} print:hidden`}>
    <details><summary><strong>Filtrar projeto</strong><span>· {ativos.length ? `${ativos.length} ${ativos.length === 1 ? "filtro aplicado" : "filtros aplicados"}` : "Projeto inteiro"} · atualizado em {dataRetrato}</span></summary>
      <div className={styles.controles}>
        <Select label="Módulo" value={filtros.modulo} onChange={(v) => filtrar("modulo", v)} todosLabel="Todos os módulos" maxWidth={9999} opcoes={op.modulo.map((m) => ({ value: m, label: m }))} />
        <Select label="Frente" value={filtros.frente} onChange={(v) => filtrar("frente", v)} todosLabel="X-VIA, SGD e não identificado" maxWidth={9999} opcoes={FRENTES.map((f) => ({ value: f, label: f }))} />
        <Select label="Órgão" value={filtros.orgao} onChange={(v) => filtrar("orgao", v)} todosLabel="Todos os órgãos" maxWidth={9999} opcoes={op.orgao.map((o) => ({ value: o, label: o }))} />
        <Select label="Sprint" value={filtros.sprint} onChange={(v) => filtrar("sprint", v)} todosLabel="Todas as sprints" maxWidth={9999} opcoes={op.sprint.map((s) => ({ value: s, label: nomeSprint(s) }))} />
      </div>
    </details>
    {ativos.length > 0 && <div className={styles.aplicados} aria-live="polite">
      <span>{fmtNum(total)} registros encontrados.</span>
      {ativos.map((k) => <button key={k} type="button" onClick={() => filtrar(k, "")} aria-label={`Remover filtro ${ROTULO[k]}`} className="rounded-full px-3 py-1" style={{ background: "var(--ds-color-primary-600)", color: "var(--ds-color-text-inverse)" }}>
        {ROTULO[k]}: {k === "sprint" ? nomeSprint(filtros[k]) : filtros[k]} <span aria-hidden>×</span>
      </button>)}
      <button type="button" onClick={limpar} className={styles.link}>Limpar filtros</button>
      <span>Indicadores contratuais consideram apenas a X-VIA.</span>
    </div>}
  </section>;
}
