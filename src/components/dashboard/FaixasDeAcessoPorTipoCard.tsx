import type { FaixaAcessoPorTipo } from "@/lib/data";

const COR_GOVBR = "var(--ds-color-primary-600)";
const COR_PROPRIO = "var(--ds-color-neutral-300, #d4d4d4)";
const LIMIAR_PCT_INLINE = 5;

function fmtPct(pct: number): string {
  return `${pct.toFixed(1).replace(".", ",")}%`;
}

/** Composição Gov.BR × Login Próprio dentro de cada faixa de último acesso.
 *  Barras 100% empilhadas com % dentro do próprio segmento (leitura executiva
 *  — 1 olhada resolve). Segmento <12% joga o rótulo à direita, fora da barra. */
export function FaixasDeAcessoPorTipoCard({ faixas }: { faixas: FaixaAcessoPorTipo[] }) {
  const comDado = faixas.filter((f) => f.total > 0);
  if (comDado.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex items-center gap-5 text-sm"
        style={{ color: "var(--ds-color-text-secondary)" }}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden style={{ background: COR_GOVBR }} className="w-3 h-3 rounded-sm shrink-0" />
          Gov.BR
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden style={{ background: COR_PROPRIO }} className="w-3 h-3 rounded-sm shrink-0" />
          Login Próprio
        </span>
      </div>

      <ul className="flex flex-col gap-4">
        {comDado.map((f) => {
          const pctGovbr = (100 * f.govbr) / f.total;
          const pctProprio = 100 - pctGovbr;
          const govbrInline = pctGovbr >= LIMIAR_PCT_INLINE;
          const proprioInline = pctProprio >= LIMIAR_PCT_INLINE;
          return (
            <li key={f.faixa} className="flex flex-col gap-2">
              <p className="text-base leading-tight" style={{ color: "var(--ds-color-text-primary)" }}>
                <span className="font-medium">{f.faixa}</span>
                <span
                  className="ml-2 text-xs tabular-nums"
                  style={{ color: "var(--ds-color-text-muted)" }}
                >
                  · {f.total.toLocaleString("pt-BR")} contas
                </span>
              </p>

              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="flex h-6 flex-1 rounded overflow-hidden min-w-0"
                  style={{ background: COR_PROPRIO }}
                  role="img"
                  aria-label={`${f.faixa}: ${pctGovbr.toFixed(0)}% Gov.BR, ${pctProprio.toFixed(0)}% Login Próprio`}
                >
                  {pctGovbr > 0 && (
                    <div
                      className="flex items-center justify-center px-1"
                      style={{ width: `${pctGovbr}%`, background: COR_GOVBR, minWidth: 0 }}
                    >
                      {govbrInline && (
                        <span
                          className="text-sm font-semibold tabular-nums whitespace-nowrap"
                          style={{ color: "#fff" }}
                        >
                          {fmtPct(pctGovbr)}
                        </span>
                      )}
                    </div>
                  )}
                  {proprioInline && (
                    <div
                      className="flex items-center justify-center px-1"
                      style={{ width: `${pctProprio}%`, minWidth: 0 }}
                    >
                      <span
                        className="text-sm font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: "var(--ds-color-text-primary)" }}
                      >
                        {fmtPct(pctProprio)}
                      </span>
                    </div>
                  )}
                </div>

                {(!govbrInline || !proprioInline) && (
                  <span
                    className="text-xs tabular-nums whitespace-nowrap"
                    style={{ color: "var(--ds-color-text-secondary)" }}
                  >
                    {!govbrInline && pctGovbr > 0 && `Gov.BR ${fmtPct(pctGovbr)}`}
                    {!govbrInline && pctGovbr > 0 && !proprioInline && " · "}
                    {!proprioInline && `Próprio ${fmtPct(pctProprio)}`}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
