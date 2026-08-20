import type { FaixaAcessoPorTipo } from "@/lib/data";

const COR_GOVBR = "var(--ds-color-primary-600)";
const COR_PROPRIO = "var(--ds-color-neutral-500)";

/** Composição Gov.BR × Login Próprio dentro de cada faixa de último acesso.
 *  Uma linha por faixa: barra empilhada 100% + números absolutos.
 *  Complementa FaixasDeAcessoCard (distribuição por tempo) com a leitura
 *  cruzada de meio de entrada — usada na aba Jornada. */
export function FaixasDeAcessoPorTipoCard({ faixas }: { faixas: FaixaAcessoPorTipo[] }) {
  const comDado = faixas.filter((f) => f.total > 0);
  if (comDado.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
        <span className="flex items-center gap-2">
          <span aria-hidden style={{ background: COR_GOVBR }} className="w-3 h-3 rounded shrink-0" />
          Gov.BR
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden style={{ background: COR_PROPRIO }} className="w-3 h-3 rounded shrink-0" />
          Login Próprio
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {comDado.map((f) => {
          const pctGovbr = (100 * f.govbr) / f.total;
          const pctProprio = 100 - pctGovbr;
          return (
            <li key={f.faixa} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-3 text-sm">
                <span style={{ color: "var(--ds-color-text-primary)" }} className="flex-1 min-w-0 truncate">
                  {f.faixa}
                </span>
                <span style={{ color: "var(--ds-color-text-secondary)" }} className="tabular-nums text-xs">
                  {f.total.toLocaleString("pt-BR")} contas
                </span>
              </div>
              <div
                className="flex h-3 rounded overflow-hidden"
                style={{ background: "var(--ds-color-background-muted)" }}
                role="img"
                aria-label={`${f.faixa}: ${pctGovbr.toFixed(0)}% Gov.BR, ${pctProprio.toFixed(0)}% Login Próprio`}
              >
                {pctGovbr > 0 && (
                  <div
                    style={{ width: `${pctGovbr}%`, background: COR_GOVBR }}
                    title={`Gov.BR: ${f.govbr.toLocaleString("pt-BR")} (${pctGovbr.toFixed(1)}%)`}
                  />
                )}
                {pctProprio > 0 && (
                  <div
                    style={{ width: `${pctProprio}%`, background: COR_PROPRIO }}
                    title={`Login Próprio: ${f.proprio.toLocaleString("pt-BR")} (${pctProprio.toFixed(1)}%)`}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs tabular-nums" style={{ color: "var(--ds-color-text-muted)" }}>
                <span>Gov.BR {pctGovbr.toFixed(1)}%</span>
                <span>Login Próprio {pctProprio.toFixed(1)}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
