import type { FaixaAcesso } from "@/lib/data";

/** Cor por semântica (semáforo temporal): recente = verde, antigo = vermelho.
 *  "Uma vez apenas" fica cinza — é categoria à parte, não é "antigo". */
const CORES: Record<string, string> = {
  "Nos últimos 6 meses": "var(--ds-color-success)",
  "Entre 6 meses e 2 anos": "var(--ds-color-primary-600)",
  "Entre 2 e 4 anos": "var(--ds-color-warning)",
  "Mais de 4 anos": "var(--ds-color-danger)",
  "Uma vez apenas": "var(--ds-color-neutral-400)",
};

/** Distribuição visual das faixas — barra empilhada 100% + tabela com números.
 *  Ordem cronológica (recente → antigo) + "Uma vez apenas" ao final. */
export function FaixasDeAcessoCard({ faixas }: { faixas: FaixaAcesso[] }) {
  const total = faixas.reduce((a, f) => a + f.quantidade, 0);
  if (total === 0) return null;

  return (
    <div>
      <div
        className="flex h-4 rounded overflow-hidden mb-4"
        style={{ background: "var(--ds-color-background-muted)" }}
        role="img"
        aria-label="Distribuição das contas por faixa de acesso"
      >
        {faixas.map((f) => {
          const pct = (100 * f.quantidade) / total;
          if (pct === 0) return null;
          return (
            <div
              key={f.faixa}
              style={{ width: `${pct}%`, background: CORES[f.faixa] ?? "var(--ds-color-neutral-400)" }}
              title={`${f.faixa}: ${f.quantidade.toLocaleString("pt-BR")} (${f.percentPct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      <ul className="flex flex-col gap-2">
        {faixas.map((f) => (
          <li key={f.faixa} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              style={{ background: CORES[f.faixa] ?? "var(--ds-color-neutral-400)" }}
              className="w-3 h-3 rounded shrink-0"
            />
            <span style={{ color: "var(--ds-color-text-primary)" }} className="flex-1">
              {f.faixa}
            </span>
            <span style={{ color: "var(--ds-color-text-secondary)" }} className="tabular-nums">
              {f.quantidade.toLocaleString("pt-BR")}
            </span>
            <span
              style={{ color: "var(--ds-color-text-muted)" }}
              className="tabular-nums w-14 text-right"
            >
              {f.percentPct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
