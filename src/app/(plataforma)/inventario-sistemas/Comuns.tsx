import { rotuloSistema, type Sistema } from "@/lib/inventario-sistemas";

/** Peças pequenas reaproveitadas pelas abas do inventário. Sem cálculo. */

export const corTexto = {
  primario: "var(--ds-color-text-primary)",
  secundario: "var(--ds-color-text-secondary)",
  apoio: "var(--ds-color-text-muted)",
};

/** Lista de sistemas clicável (abre a ficha). Rola quando passa de ~10 itens. */
export function ListaSistemas({
  sistemas,
  onAbrir,
  detalhe,
  vazio,
}: {
  sistemas: Sistema[];
  onAbrir: (id: string) => void;
  detalhe?: (s: Sistema) => string;
  vazio: string;
}) {
  if (sistemas.length === 0)
    return <p className="bi-body-small" style={{ color: corTexto.secundario }}>{vazio}</p>;
  return (
    <ul className="flex flex-col max-h-96 overflow-y-auto -mx-2" aria-label="Sistemas">
      {sistemas.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onAbrir(s.id)}
            className="w-full text-left px-2 py-2 rounded hover:bg-[var(--ds-color-background-muted)] flex flex-col"
          >
            <span className="bi-body-small min-w-0 break-words" style={{ color: corTexto.primario }}>{rotuloSistema(s)}</span>
            {detalhe && (
              <span className="bi-caption" style={{ color: corTexto.apoio }}>{detalhe(s)}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Lista de órgãos em fichas pequenas. */
export function Chips({ itens, vazio }: { itens: string[]; vazio: string }) {
  if (itens.length === 0) return <p className="bi-body-small" style={{ color: corTexto.secundario }}>{vazio}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {itens.map((i) => (
        <li
          key={i}
          className="bi-caption px-2 py-1 rounded"
          style={{ border: "1px solid var(--ds-color-border)", color: corTexto.primario, background: "var(--ds-color-background-muted)" }}
        >
          {i}
        </li>
      ))}
    </ul>
  );
}

/** Barra horizontal de percentual com rótulo e valor ("124 de 208 · 60%"). */
export function BarraPercentual({
  rotulo,
  pct,
  detalhe,
  cor = "var(--ds-color-primary-600)",
}: {
  rotulo: string;
  pct: number;
  detalhe: string;
  cor?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <span className="bi-body-small" style={{ color: corTexto.primario }}>{rotulo}</span>
        <span className="bi-caption" style={{ color: corTexto.secundario }}>
          {detalhe} · <strong style={{ color: corTexto.primario }}>{pct}%</strong>
        </span>
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: "var(--ds-color-background-muted)" }}
        role="img"
        aria-label={`${rotulo}: ${pct}%`}
      >
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, background: cor }} />
      </div>
    </div>
  );
}

/** Bloco com título em forma de pergunta e uma explicação curta do indicador. */
export function Bloco({
  titulo,
  explica,
  children,
}: {
  titulo: string;
  explica: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-w-0 flex flex-col"
      style={{
        border: "1px solid var(--ds-color-border)",
        borderRadius: "var(--ds-radius-md)",
        padding: "var(--ds-spacing-20)",
        background: "var(--ds-color-background)",
      }}
    >
      <h3 className="bi-card-title" style={{ color: corTexto.primario }}>{titulo}</h3>
      <p className="bi-caption mt-1 mb-3" style={{ color: corTexto.secundario }}>{explica}</p>
      {children}
    </div>
  );
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bi-body-small bi-narrative"
      style={{
        borderLeft: "4px solid var(--ds-color-warning)",
        background: "var(--ds-color-warning-50, #fff8e1)",
        borderRadius: "var(--ds-radius-sm)",
        padding: "var(--ds-spacing-12)",
        color: corTexto.primario,
      }}
    >
      {children}
    </div>
  );
}
