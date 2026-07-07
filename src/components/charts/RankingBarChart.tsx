/**
 * Ranking horizontal com cor por intensidade — barra mais longa E mais escura =
 * mais acessos. Réplica do padrão do matomo-analytics-dashboard
 * (charts_formatter.py::create_top_bar_chart, escala contínua Blues): o valor
 * mapeia a opacidade da cor primária (min→claro, max→cheio). Itens devem vir
 * ordenados desc. `href` opcional abre o serviço em nova aba.
 */
export type ItemRanking = { label: string; valor: number; sublabel?: string; href?: string };

export function RankingBarChart({ itens }: { itens: ItemRanking[] }) {
  const max = itens.reduce((m, x) => Math.max(m, x.valor), 0);

  return (
    <div className="flex flex-col gap-3">
      {itens.map((it, i) => {
        const frac = max > 0 ? it.valor / max : 0;
        const largura = Math.max(frac * 100, 4);
        const opacidade = 0.35 + 0.65 * frac; // intensidade: claro (menos) → cheio (mais)
        const Wrapper = it.href ? "a" : "div";
        return (
          <Wrapper
            key={it.href ?? it.label + i}
            {...(it.href ? { href: it.href, target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`block rounded px-2 py-1.5 -mx-2 transition-colors ${it.href ? "group hover:bg-[var(--ds-color-background-muted)]" : ""}`}
          >
            <div className="flex justify-between items-baseline gap-3 text-sm mb-1">
              <span
                className={`font-medium truncate ${it.href ? "group-hover:underline" : ""}`}
                style={{ color: "var(--ds-color-text-primary)" }}
              >
                {it.label}
              </span>
              {it.sublabel && (
                <span className="shrink-0 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                  {it.sublabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded" style={{ background: "var(--ds-color-background-muted)" }}>
                <div
                  className="h-2.5 rounded"
                  style={{ width: `${largura}%`, background: "var(--ds-color-primary-600)", opacity: opacidade }}
                />
              </div>
              <span
                className="shrink-0 w-14 text-right text-sm font-semibold"
                style={{ color: "var(--ds-color-primary-600)" }}
              >
                {it.valor.toLocaleString("pt-BR")}
              </span>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
