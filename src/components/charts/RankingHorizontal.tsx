import { OrgaosChips } from "@/components/dashboard/OrgaosChips";

/** Barras horizontais escaladas ao maior valor da lista — leitura executiva
 *  de ranking + share. CSS puro, sem lib. Mesma família visual do
 *  StackedBarChart e CadenciaAcessoFunil. */
export type ItemRanking = {
  label: string;
  valor: number;
  sharePct: number;
  sub?: string;
  icone?: string;
  /** Se presente, `label` vira link externo com sufixo ↗. */
  href?: string;
};

export function RankingHorizontal({
  itens,
  cor = "var(--ds-color-primary-600)",
  fundo = "var(--ds-color-background-muted)",
  chipsPorItem,
}: {
  itens: ItemRanking[];
  cor?: string;
  fundo?: string;
  /** Se retornar array não-vazio pra um label, renderiza <OrgaosChips> abaixo. */
  chipsPorItem?: (label: string) => string[];
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((it) => {
        const pctBarra = (100 * it.valor) / max;
        return (
          <li key={it.label}>
            <div className="flex justify-between items-baseline gap-3 text-sm mb-1">
              <span className="flex items-center gap-2 min-w-0" style={{ color: "var(--ds-color-text-primary)" }}>
                {it.icone && (
                  <span
                    className="material-icons shrink-0"
                    aria-hidden
                    style={{ fontSize: 16, color: "var(--ds-color-text-muted)" }}
                  >
                    {it.icone}
                  </span>
                )}
                {it.href ? (
                  <a
                    href={it.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium truncate hover:underline"
                    style={{ color: "var(--ds-color-primary-600)" }}
                  >
                    {it.label} ↗
                  </a>
                ) : (
                  <span className="font-medium truncate">{it.label}</span>
                )}
                {it.sub && (
                  <span className="text-xs shrink-0" style={{ color: "var(--ds-color-text-muted)" }}>
                    {it.sub}
                  </span>
                )}
              </span>
              <span className="tabular-nums text-xs shrink-0" style={{ color: "var(--ds-color-text-secondary)" }}>
                {it.valor.toLocaleString("pt-BR")}{" "}
                <span style={{ color: "var(--ds-color-text-muted)" }}>({it.sharePct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-2 rounded overflow-hidden" style={{ background: fundo }}>
              <div style={{ width: `${pctBarra}%`, height: "100%", background: cor, transition: "width 300ms ease" }} />
            </div>
            {chipsPorItem && (
              <div className="mt-1">
                <OrgaosChips orgaos={chipsPorItem(it.label)} tamanho="xs" align="start" />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
