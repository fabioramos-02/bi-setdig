import type { OrgaoResponsavel } from "@/lib/insights-categorias";

const FMT = new Intl.NumberFormat("pt-BR");

/** Inverte a leitura da aba: em vez de "quais órgãos sustentam esta
 *  categoria?", responde "quais categorias este órgão sustenta e quanto
 *  do uso do app passa por ele?". Ordenado por acessos (desc).
 *  Top 5 em destaque, demais recolhidos em expandir (mesmo padrão dos cards). */
export function OrgaosPorCategoriaSection({
  orgaos,
  totalGeral,
}: {
  orgaos: OrgaoResponsavel[];
  totalGeral: number;
}) {
  if (orgaos.length === 0) return null;
  const top = orgaos.slice(0, 5);
  const demais = orgaos.slice(5);
  const acessosDemais = demais.reduce((a, o) => a + o.acessos, 0);
  const shareDemais = demais.reduce((a, o) => a + o.sharePct, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4
          className="text-xs font-semibold uppercase tracking-wide mb-3"
          style={{ color: "var(--ds-color-text-muted)" }}
        >
          Top 5 com mais acessos
        </h4>
        <ul className="flex flex-col gap-3">
          {top.map((o) => (
            <LinhaOrgao key={o.sigla} orgao={o} totalGeral={totalGeral} variante="destaque" />
          ))}
        </ul>
      </div>

      {demais.length > 0 && (
        <details className="print-expandir">
          <summary
            className="text-sm font-medium cursor-pointer select-none"
            style={{ color: "var(--ds-color-text-secondary)" }}
          >
            Ver outros {demais.length} órgãos
            {totalGeral > 0 && ` · ${shareDemais.toFixed(1)}% dos acessos (${FMT.format(acessosDemais)})`}
          </summary>
          <ul className="flex flex-col gap-2 mt-3">
            {demais.map((o) => (
              <LinhaOrgao key={o.sigla} orgao={o} totalGeral={totalGeral} variante="compacto" />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function LinhaOrgao({
  orgao: o,
  totalGeral,
  variante,
}: {
  orgao: OrgaoResponsavel;
  totalGeral: number;
  variante: "destaque" | "compacto";
}) {
  const compacto = variante === "compacto";
  return (
    <li
      className={`rounded flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5 ${
        compacto ? "p-3" : "p-4"
      }`}
      style={{
        background: "var(--ds-color-background)",
        border: "1px solid var(--ds-color-border)",
      }}
    >
      {/* Sigla + métricas */}
      <div className={`flex items-start gap-3 ${compacto ? "sm:w-44" : "sm:w-52"} sm:shrink-0`}>
        <div
          className={`rounded tabular-nums font-bold leading-none whitespace-nowrap ${
            compacto ? "px-2 py-1.5 text-sm" : "px-3 py-2 text-base"
          }`}
          style={{
            background: "var(--ds-color-primary-50, #e6f0fa)",
            color: "var(--ds-color-primary-700, #0b3d75)",
            border: "1px solid var(--ds-color-primary-200, #b3d1ec)",
          }}
        >
          {o.sigla}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className={`font-semibold tabular-nums leading-tight ${compacto ? "text-xs" : "text-sm"}`}
            style={{ color: "var(--ds-color-text-primary)" }}
          >
            {o.categorias.length} categoria{o.categorias.length === 1 ? "" : "s"}
          </span>
          <span className="text-xs tabular-nums" style={{ color: "var(--ds-color-text-secondary)" }}>
            {o.totalAtivos} de {o.totalServicos} serviços ativos
          </span>
        </div>
      </div>

      {/* Chips de categorias sustentadas */}
      <div className="flex flex-wrap gap-1.5 items-center flex-1 min-w-0">
        {o.categorias.map((c) => (
          <span
            key={c}
            className="text-xs px-2 py-0.5 rounded whitespace-nowrap"
            style={{
              background: "var(--ds-color-background-muted)",
              color: "var(--ds-color-text-secondary)",
              border: "1px solid var(--ds-color-border)",
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Acessos: número + share, sem barra */}
      <div className={`flex flex-col ${compacto ? "sm:w-32" : "sm:w-40"} sm:shrink-0 sm:items-end`}>
        <span
          className={`tabular-nums font-bold leading-tight ${compacto ? "text-base" : "text-xl"}`}
          style={{ color: "var(--ds-color-text-primary)" }}
        >
          {FMT.format(o.acessos)}
        </span>
        <span className="text-xs tabular-nums" style={{ color: "var(--ds-color-text-secondary)" }}>
          {totalGeral > 0 ? `${o.sharePct.toFixed(1)}% do uso do app` : "sem acessos no período"}
        </span>
      </div>
    </li>
  );
}
