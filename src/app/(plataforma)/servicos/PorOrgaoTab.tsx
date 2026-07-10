import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { topOrgaos } from "@/lib/servicos";
import type { InventarioOrgao } from "@/lib/data";

/** Conteúdo da aba "Por Órgão" — ranking + tabela completa do inventário de
 * cartas agregado por órgão responsável. Extraído de ServicosClient pra não
 * estourar 250 linhas/arquivo. */
export function PorOrgaoTab({ orgaos }: { orgaos: InventarioOrgao[] }) {
  if (orgaos.length === 0) {
    return <EmptyCard message="Nenhum órgão com cartas cadastradas." />;
  }

  const ranking = topOrgaos(orgaos, 10).map((o) => ({
    label: o.orgaoSigla,
    valor: o.total,
    sublabel: `${o.percentDigital.toFixed(0)}% digital`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <DashboardSection title="Top 10 órgãos por total de cartas">
        <RankingBarChart itens={ranking} />
      </DashboardSection>

      <DashboardSection
        title="Todos os órgãos"
        action={
          <ExportCsvButton
            rows={orgaos.map((o) => ({
              orgao: o.orgao,
              total: o.total,
              ativos: o.ativos,
              digitais: o.digitais,
              percentDigital: o.percentDigital,
              maturidadeMedia: o.maturidadeMedia,
              classificadas: o.classificadas,
            }))}
            filename="cartas-por-orgao"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                <th className="pb-2">Órgão</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2 text-right">Ativas</th>
                <th className="pb-2 text-right">% Digital</th>
                <th className="pb-2 text-right">Maturidade média</th>
                <th className="pb-2 text-right">Revisadas</th>
              </tr>
            </thead>
            <tbody>
              {orgaos.map((o) => (
                <tr key={o.orgao} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                  <td className="py-1.5 truncate max-w-[150px] sm:max-w-none">{o.orgao}</td>
                  <td className="py-1.5 text-right">{o.total.toLocaleString("pt-BR")}</td>
                  <td className="py-1.5 text-right">{o.ativos.toLocaleString("pt-BR")}</td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                    {o.percentDigital.toFixed(1)}%
                  </td>
                  <td className="py-1.5 text-right">{o.maturidadeMedia.toFixed(2)}</td>
                  <td className="py-1.5 text-right" style={{ color: "var(--ds-color-text-secondary)" }}>
                    {o.classificadas > 0 ? o.classificadas : "—"}
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
