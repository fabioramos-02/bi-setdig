const COR_NATIVO = "var(--ds-color-primary-600)";
const COR_WEB = "var(--ds-color-neutral-300, #d4d4d4)";
const LIMIAR_INLINE = 10;

function fmtInt(n: number): string {
  return n.toLocaleString("pt-BR");
}

function fmtPct(p: number): string {
  return `${p.toFixed(0)}%`;
}

/** Barra 100% empilhada horizontal — Nativos × Redirecionados num único KPI
 *  de composição. Mesmo idioma visual do FaixasDeAcessoPorTipoCard.
 *  ponytail: prop `web` mantida no código (dado interno segue `tipo: "web"`
 *  no catálogo); só o texto visível fala "redirecionado" — termo de negócio. */
export function NativoWebBar({
  nativo,
  web,
  variante = "completa",
  unidade = "serviços",
  rotulos = { nativo: "nativos", web: "redirecionados" },
}: {
  nativo: number;
  web: number;
  /** O que `nativo`/`web` contam — catálogo conta serviços, Funcionalidades conta acessos. */
  unidade?: string;
  rotulos?: { nativo: string; web: string };
  /** `compacta` esconde a legenda (usa quando a legenda já aparece
   *  externamente, ex.: numa lista por categoria) e reduz a altura. */
  variante?: "completa" | "compacta";
}) {
  const total = nativo + web;
  if (total === 0) return null;
  const pctNativo = (100 * nativo) / total;
  const pctWeb = 100 - pctNativo;
  const nativoInline = pctNativo >= LIMIAR_INLINE;
  const webInline = pctWeb >= LIMIAR_INLINE;
  const compacta = variante === "compacta";
  const alturaBarra = compacta ? "h-5" : "h-8";

  return (
    <div className="flex flex-col gap-3">
      {!compacta && (
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
            Redirecionado (abre navegador)
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`flex ${alturaBarra} flex-1 rounded overflow-hidden min-w-0`}
          style={{ background: COR_WEB }}
          role="img"
          aria-label={`${fmtInt(nativo)} ${unidade} ${rotulos.nativo} (${fmtPct(pctNativo)}) e ${fmtInt(web)} ${rotulos.web} (${fmtPct(pctWeb)})`}
        >
          {pctNativo > 0 && (
            <div
              className="flex items-center justify-center px-2"
              style={{ width: `${pctNativo}%`, background: COR_NATIVO, minWidth: 0 }}
            >
              {nativoInline && !compacta && (
                <span className="hidden sm:inline text-sm font-semibold tabular-nums whitespace-nowrap" style={{ color: "#fff" }}>
                  {fmtInt(nativo)} {rotulos.nativo} ({fmtPct(pctNativo)})
                </span>
              )}
            </div>
          )}
          {webInline && !compacta && (
            <div className="flex items-center justify-center px-2" style={{ width: `${pctWeb}%`, minWidth: 0 }}>
              <span
                className="hidden sm:inline text-sm font-semibold tabular-nums whitespace-nowrap"
                style={{ color: "var(--ds-color-text-primary)" }}
              >
                {fmtInt(web)} {rotulos.web} ({fmtPct(pctWeb)})
              </span>
            </div>
          )}
        </div>

        {!compacta && (!nativoInline || !webInline) && (
          <span
            className="hidden sm:inline text-xs tabular-nums whitespace-nowrap"
            style={{ color: "var(--ds-color-text-secondary)" }}
          >
            {!nativoInline && `${fmtInt(nativo)} ${rotulos.nativo}`}
            {!nativoInline && !webInline && " · "}
            {!webInline && `${fmtInt(web)} ${rotulos.web}`}
          </span>
        )}
      </div>

      {/* Mobile: segmento estreito não cabe o rótulo inline (vazava) — números
          descem pra uma linha só, abaixo da barra. */}
      {!compacta && (
        <p className="sm:hidden text-xs tabular-nums" style={{ color: "var(--ds-color-text-secondary)" }}>
          {fmtInt(nativo)} {rotulos.nativo} ({fmtPct(pctNativo)}) · {fmtInt(web)} {rotulos.web} ({fmtPct(pctWeb)})
        </p>
      )}
    </div>
  );
}
