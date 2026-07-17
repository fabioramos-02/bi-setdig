/**
 * Ranking horizontal com cor por intensidade — barra mais longa E mais escura =
 * mais acessos. Réplica do padrão do matomo-analytics-dashboard
 * (charts_formatter.py::create_top_bar_chart, escala contínua Blues): o valor
 * mapeia a opacidade da cor primária (min→claro, max→cheio). Itens devem vir
 * ordenados desc. `href` opcional abre o serviço em nova aba.
 */
export type ItemRanking = { label: string; valor: number; sublabel?: string; href?: string };

export function RankingBarChart({
  itens,
  cor = "var(--ds-color-primary-600)",
  formatarValor = (v: number) => v.toLocaleString("pt-BR"),
  compact = false,
}: {
  itens: ItemRanking[];
  cor?: string;
  /** Formata o número à direita da barra — default pt-BR sem unidade. Passe
   * `(v) => `${v}%`` para percentuais, por ex. */
  formatarValor?: (valor: number) => string;
  /** Reduz espaçamento e altura das barras — pra caber mais no relatório/PDF
   * sem perder legibilidade (usado na Visão Geral). */
  compact?: boolean;
}) {
  const max = itens.reduce((m, x) => Math.max(m, x.valor), 0);
  const alturaBarra = compact ? "h-2" : "h-2.5";

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
      {itens.map((it, i) => {
        const frac = max > 0 ? it.valor / max : 0;
        const largura = Math.max(frac * 100, 4);
        const opacidade = 0.35 + 0.65 * frac; // intensidade: claro (menos) → cheio (mais)
        const Wrapper = it.href ? "a" : "div";
        return (
          <Wrapper
            key={`${it.href ?? it.label}-${i}`}
            {...(it.href ? { href: it.href, target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`block rounded px-2 -mx-2 transition-colors ${compact ? "py-1" : "py-1.5"} ${it.href ? "group hover:bg-[var(--ds-color-background-muted)]" : ""}`}
          >
            <div className={`flex justify-between items-baseline gap-3 text-sm ${compact ? "mb-0.5" : "mb-1"}`}>
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
              <div className={`flex-1 ${alturaBarra} rounded`} style={{ background: "var(--ds-color-background-muted)" }}>
                <div
                  className={`${alturaBarra} rounded`}
                  style={{ width: `${largura}%`, background: cor, opacity: opacidade }}
                />
              </div>
              <span
                className="shrink-0 w-14 text-right text-sm font-semibold"
                style={{ color: cor }}
              >
                {formatarValor(it.valor)}
              </span>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
