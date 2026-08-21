import { OrgaosChips } from "./OrgaosChips";

type Props = {
  categoria: string;
  icone: string;
  totalServicos: number;
  acessos: number;
  sharePct: number;
  soAtalhoWeb: boolean;
  /** Todos os serviços da categoria estão inativos → badge de aviso. */
  inativa: boolean;
  orgaos: string[];
  ativo: boolean;
  variante: "destaque" | "compacto";
  onClick: () => void;
  /** Share máximo do conjunto — pra escalar a barrinha relativa ao top. */
  shareMax: number;
  totalGeral: number;
};

function BadgeInativa({ tamanho }: { tamanho: "xs" | "sm" }) {
  const px = tamanho === "sm" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0.5 text-[10px]";
  return (
    <span
      className={`rounded font-medium uppercase tracking-wide ${px}`}
      style={{ background: "var(--ds-color-danger-100, #fee2e2)", color: "var(--ds-color-danger, #b91c1c)" }}
      title="Todos os serviços desta categoria estão desativados"
    >
      inativa
    </span>
  );
}

const FMT = new Intl.NumberFormat("pt-BR");

/** Card clicável de categoria — 2 variantes (Top 5 destaque, cauda compacta).
 *  Extraído do grid da CategoriasTab pra reuso nos 2 blocos. */
export function CategoriaCard({
  categoria,
  icone,
  totalServicos,
  acessos,
  sharePct,
  soAtalhoWeb,
  inativa,
  orgaos,
  ativo,
  variante,
  onClick,
  shareMax,
  totalGeral,
}: Props) {
  const border = ativo
    ? "2px solid var(--ds-color-primary-600)"
    : "1px solid var(--ds-color-border)";
  const pctBarra = shareMax > 0 ? (100 * sharePct) / shareMax : 0;
  const opacidade = inativa ? 0.7 : 1;

  if (variante === "destaque") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-center text-center rounded p-4 gap-2 transition-shadow hover:shadow-md"
        style={{ background: "var(--ds-color-background)", border, opacity: opacidade }}
      >
        <span
          className="material-icons"
          style={{ color: "var(--ds-color-primary-600)", fontSize: 32 }}
          aria-hidden
        >
          {icone}
        </span>
        <span
          className="text-base font-semibold leading-tight"
          style={{ color: "var(--ds-color-text-primary)" }}
        >
          {categoria}
        </span>
        {inativa && <BadgeInativa tamanho="sm" />}
        {soAtalhoWeb ? (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: "var(--ds-color-background-muted)",
              color: "var(--ds-color-text-secondary)",
            }}
          >
            atalho externo
          </span>
        ) : (
          <>
            <span
              className="text-xl font-bold tabular-nums leading-tight"
              style={{ color: "var(--ds-color-text-primary)" }}
            >
              {FMT.format(acessos)}
            </span>
            <span
              className="text-xs tabular-nums"
              style={{ color: "var(--ds-color-text-secondary)" }}
            >
              acessos · {sharePct.toFixed(1)}% · {totalServicos} serviços
            </span>
          </>
        )}
        <OrgaosChips orgaos={orgaos} tamanho="sm" align="center" />
        {totalGeral > 0 && !soAtalhoWeb && (
          <div
            className="w-full h-1.5 rounded overflow-hidden mt-1"
            style={{ background: "var(--ds-color-background-muted)" }}
          >
            <div
              style={{
                width: `${pctBarra}%`,
                height: "100%",
                background: "var(--ds-color-primary-600)",
              }}
            />
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 text-left rounded p-3 transition-shadow hover:shadow-sm w-full"
      style={{ background: "var(--ds-color-background)", border, opacity: opacidade }}
    >
      <span
        className="material-icons shrink-0"
        style={{ color: "var(--ds-color-primary-600)", fontSize: 20 }}
        aria-hidden
      >
        {icone}
      </span>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "var(--ds-color-text-primary)" }}
            >
              {categoria}
            </span>
            {inativa && <BadgeInativa tamanho="xs" />}
          </span>
          {!soAtalhoWeb && (
            <span
              className="text-xs tabular-nums whitespace-nowrap shrink-0"
              style={{ color: "var(--ds-color-text-secondary)" }}
            >
              {FMT.format(acessos)} · {sharePct.toFixed(1)}%
            </span>
          )}
        </div>
        {soAtalhoWeb ? (
          <span className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            atalho externo · {totalServicos} serviço{totalServicos === 1 ? "" : "s"}
          </span>
        ) : (
          <>
            {totalGeral > 0 && (
              <div
                className="h-1 rounded overflow-hidden"
                style={{ background: "var(--ds-color-background-muted)" }}
              >
                <div
                  style={{
                    width: `${pctBarra}%`,
                    height: "100%",
                    background: "var(--ds-color-primary-600)",
                  }}
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                {totalServicos} serviço{totalServicos === 1 ? "" : "s"}
              </span>
              <OrgaosChips orgaos={orgaos} tamanho="xs" align="start" />
            </div>
          </>
        )}
      </div>
    </button>
  );
}
