import type { FaixaAcesso } from "@/lib/data";
import { CategoryDonut, type FatiaCategoria } from "@/components/charts/CategoryDonut";

/** Donut da recência das contas + KPI grande do maior segmento de fricção
 *  ("Uma vez apenas"). Responde: "quantas pessoas criaram a conta e nunca
 *  voltaram?". Base é snapshot do banco MS_digital — não reage ao filtro. */
export function RecenciaContasCard({ faixas }: { faixas: FaixaAcesso[] }) {
  const total = faixas.reduce((a, f) => a + f.quantidade, 0);
  if (total === 0) return null;

  const dadosDonut: FatiaCategoria[] = faixas.map((f) => ({
    categoria: f.faixa,
    valor: f.quantidade,
    participacaoPct: f.percentPct,
  }));

  const usoUnico = faixas.find((f) => f.faixa === "Uma vez apenas");

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch">
      <div className="lg:flex-1 min-w-0">
        <CategoryDonut dados={dadosDonut} />
      </div>
      {usoUnico && (
        <div
          className="flex flex-col justify-center lg:w-56 lg:shrink-0"
          style={{
            borderLeft: "1px solid var(--ds-color-border)",
            paddingLeft: "var(--ds-spacing-20)",
          }}
        >
          <div
            style={{ color: "var(--ds-color-danger)" }}
            className="text-4xl sm:text-5xl font-semibold tabular-nums"
          >
            {usoUnico.percentPct.toFixed(1)}%
          </div>
          <div style={{ color: "var(--ds-color-text-primary)" }} className="text-sm font-medium mt-2">
            Criaram a conta e não voltaram
          </div>
          <div style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-3">
            <span className="tabular-nums">{usoUnico.quantidade.toLocaleString("pt-BR")}</span>{" "}
            contas de uso único, entre {total.toLocaleString("pt-BR")} cadastradas.
          </div>
        </div>
      )}
    </div>
  );
}
