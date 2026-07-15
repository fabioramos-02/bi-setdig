export type ItemStackedBar = { label: string; atendidos: number; pendentes: number };

/** Barra horizontal empilhada (atendidos/pendentes) — mesmo estilo de
 * RankingBarChart (label + valor + barra), 2 segmentos em vez de 1. Sem
 * legenda embutida — fica no componente chamador, junto do título da seção. */
export function StackedBarChart({ itens }: { itens: ItemStackedBar[] }) {
  const max = itens.reduce((m, it) => Math.max(m, it.atendidos + it.pendentes), 0);

  return (
    <div className="flex flex-col gap-3">
      {itens.map((it) => {
        const total = it.atendidos + it.pendentes;
        const fracAtendidos = max > 0 ? (it.atendidos / max) * 100 : 0;
        const fracPendentes = max > 0 ? (it.pendentes / max) * 100 : 0;
        return (
          <div key={it.label}>
            <div className="flex justify-between items-baseline gap-3 text-sm mb-1">
              <span className="font-medium truncate" style={{ color: "var(--ds-color-text-primary)" }}>
                {it.label}
              </span>
              <span className="shrink-0 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                {total.toLocaleString("pt-BR")}
              </span>
            </div>
            <div
              className="flex h-2.5 rounded overflow-hidden"
              style={{ background: "var(--ds-color-background-muted)" }}
              title={`${it.atendidos.toLocaleString("pt-BR")} atendidos, ${it.pendentes.toLocaleString("pt-BR")} pendentes`}
            >
              <div style={{ width: `${fracAtendidos}%`, background: "var(--ds-color-success)" }} />
              <div style={{ width: `${fracPendentes}%`, background: "var(--ds-color-danger)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
