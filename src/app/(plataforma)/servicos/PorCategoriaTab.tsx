import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { labelCategoria } from "@/lib/servicos";
import type { InventarioCategoria } from "@/lib/data";

/** Conteúdo da aba "Por Categoria" — inédita nos BIs antigos de cartas
 * (nenhum deles agregava por tema como seção própria). Mesmo molde de
 * PorOrgaoTab.tsx. Extraído de ServicosClient pra não estourar 250 linhas/arquivo. */
export function PorCategoriaTab({ categorias }: { categorias: InventarioCategoria[] }) {
  if (categorias.length === 0) {
    return <EmptyCard message="Nenhuma categoria com cartas cadastradas." />;
  }

  const ranking = categorias.slice(0, 10).map((c) => ({
    label: labelCategoria(c.categoria),
    valor: c.total,
    sublabel: `${c.percentDigital.toFixed(0)}% digital`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <DashboardSection title="Top 10 categorias por total de cartas">
        <RankingBarChart itens={ranking} />
      </DashboardSection>

      <DashboardSection
        title="Todas as categorias"
        action={<ExportCsvButton rows={categorias} filename="cartas-por-categoria" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                <th className="pb-2">Categoria</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2 text-right">Ativas</th>
                <th className="pb-2 text-right">% Digital</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.categoria} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                  <td className="py-1.5">{labelCategoria(c.categoria)}</td>
                  <td className="py-1.5 text-right">{c.total.toLocaleString("pt-BR")}</td>
                  <td className="py-1.5 text-right">{c.ativos.toLocaleString("pt-BR")}</td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                    {c.percentDigital.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSection>
    </div>
  );
}
