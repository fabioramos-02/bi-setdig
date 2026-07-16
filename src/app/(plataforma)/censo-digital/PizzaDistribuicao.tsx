import type { NivelContagem } from "@/lib/censo";

/** Donut multicor da distribuição 0–4 (uma fatia por nível, cor da rampa),
 * centro com o total de serviços + legenda. Réplica da `.pizza` do site
 * original — conic-gradient montado a partir das quantidades. CSS puro. */
export function PizzaDistribuicao({ distribuicao, total }: { distribuicao: NivelContagem[]; total: number }) {
  // monta os stops do conic-gradient em graus acumulados
  let acc = 0;
  const stops: string[] = [];
  for (const d of distribuicao) {
    const ini = total ? (acc / total) * 360 : 0;
    acc += d.qtd;
    const fim = total ? (acc / total) * 360 : 0;
    stops.push(`${d.cor} ${ini}deg ${fim}deg`);
  }
  const gradiente = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        className="relative rounded-full shrink-0"
        style={{ width: 180, height: 180, background: gradiente }}
        role="img"
        aria-label={`Distribuição de ${total.toLocaleString("pt-BR")} serviços entre os níveis 0 a 4`}
      >
        <div
          className="absolute rounded-full grid place-content-center text-center"
          style={{ inset: 28, background: "var(--ds-color-background)" }}
        >
          <span className="text-2xl font-bold" style={{ color: "var(--ds-color-text-primary)" }}>
            {total.toLocaleString("pt-BR")}
          </span>
          <span className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>serviços</span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm w-full sm:w-auto">
        {distribuicao.map((d) => {
          const pct = total ? (d.qtd / total) * 100 : 0;
          return (
            <li key={d.nivel} className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.cor }} />
              <span style={{ color: "var(--ds-color-text-primary)" }}>N{d.nivel} · {d.rotulo}</span>
              <span className="ml-auto pl-3 font-semibold shrink-0" style={{ color: "var(--ds-color-text-secondary)" }}>
                {d.qtd.toLocaleString("pt-BR")} ({pct.toFixed(0)}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
