const COR_NATIVO = "var(--ds-color-primary-600)";
const COR_WEB = "var(--ds-color-neutral-300, #d4d4d4)";
const LIMIAR_INLINE = 10;

function fmtInt(n: number): string {
  return n.toLocaleString("pt-BR");
}

function fmtPct(p: number): string {
  return `${p.toFixed(0)}%`;
}

/** Barra 100% empilhada horizontal — Nativos × Web num único KPI de composição.
 *  Mesmo idioma visual do FaixasDeAcessoPorTipoCard. */
export function NativoWebBar({ nativo, web }: { nativo: number; web: number }) {
  const total = nativo + web;
  if (total === 0) return null;
  const pctNativo = (100 * nativo) / total;
  const pctWeb = 100 - pctNativo;
  const nativoInline = pctNativo >= LIMIAR_INLINE;
  const webInline = pctWeb >= LIMIAR_INLINE;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-center gap-5 text-sm"
        style={{ color: "var(--ds-color-text-secondary)" }}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden style={{ background: COR_NATIVO }} className="w-3 h-3 rounded-sm shrink-0" />
          Nativo (tela no app)
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden style={{ background: COR_WEB }} className="w-3 h-3 rounded-sm shrink-0" />
          Web (abre navegador)
        </span>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex h-8 flex-1 rounded overflow-hidden min-w-0"
          style={{ background: COR_WEB }}
          role="img"
          aria-label={`${fmtInt(nativo)} serviços nativos (${fmtPct(pctNativo)}) e ${fmtInt(web)} web (${fmtPct(pctWeb)})`}
        >
          {pctNativo > 0 && (
            <div
              className="flex items-center justify-center px-2"
              style={{ width: `${pctNativo}%`, background: COR_NATIVO, minWidth: 0 }}
            >
              {nativoInline && (
                <span className="text-sm font-semibold tabular-nums whitespace-nowrap" style={{ color: "#fff" }}>
                  {fmtInt(nativo)} nativos ({fmtPct(pctNativo)})
                </span>
              )}
            </div>
          )}
          {webInline && (
            <div className="flex items-center justify-center px-2" style={{ width: `${pctWeb}%`, minWidth: 0 }}>
              <span
                className="text-sm font-semibold tabular-nums whitespace-nowrap"
                style={{ color: "var(--ds-color-text-primary)" }}
              >
                {fmtInt(web)} web ({fmtPct(pctWeb)})
              </span>
            </div>
          )}
        </div>

        {(!nativoInline || !webInline) && (
          <span
            className="text-xs tabular-nums whitespace-nowrap"
            style={{ color: "var(--ds-color-text-secondary)" }}
          >
            {!nativoInline && `${fmtInt(nativo)} nativos`}
            {!nativoInline && !webInline && " · "}
            {!webInline && `${fmtInt(web)} web`}
          </span>
        )}
      </div>
    </div>
  );
}
