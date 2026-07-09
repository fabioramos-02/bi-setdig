import { EmptyCard } from "@/components/ds/EmptyCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import type { PaginaEntrada, DominioSaida, PadraoComportamental } from "@/lib/data";

/** Porta de matomo-analytics-dashboard/views/portal/tab4_jornada.py — 3
 * relatórios leves (não N+1): portas de entrada, fuga do hub (outlinks) e
 * padrão comportamental a partir da Home. */
export function FluxoNavegacaoTab({
  portasEntrada,
  fugaHub,
  padraoComportamental,
}: {
  portasEntrada: PaginaEntrada[];
  fugaHub: DominioSaida[];
  padraoComportamental: PadraoComportamental;
}) {
  if (portasEntrada.length === 0 && fugaHub.length === 0 && padraoComportamental.distribuicao.length === 0) {
    return <EmptyCard message="Sem dado de fluxo de navegação ainda — pipeline não extraiu essa amostra." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <DashboardSection title="🚪 Portas de Entrada (Landing Pages)">
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Por onde os cidadãos começaram a navegação?
          </p>
          {portasEntrada.length === 0 ? (
            <EmptyCard message="Sem entradas no período." />
          ) : (
            <RankingBarChart
              cor="var(--ds-color-green-600)"
              itens={portasEntrada.map((p) => ({ label: p.pagina, valor: p.entradas }))}
            />
          )}
        </DashboardSection>

        <DashboardSection title="✈️ Fuga do Hub (Links Externos)">
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Para onde os cidadãos vão ao sair do portal?
          </p>
          {fugaHub.length === 0 ? (
            <EmptyCard message="Sem saídas no período." />
          ) : (
            <RankingBarChart
              cor="var(--ds-color-red-600)"
              itens={fugaHub.map((f) => ({ label: f.dominio, valor: f.saidas }))}
            />
          )}
        </DashboardSection>
      </div>

      <DashboardSection title="🧭 Padrão Comportamental: a partir da Página Principal">
        <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          O que o cidadão acessa logo após entrar na Home?
        </p>
        {padraoComportamental.distribuicao.length === 0 ? (
          <EmptyCard message="Sem transições da Home no período." />
        ) : (
          <div className="flex flex-col gap-6">
            <CategoryDonut
              dados={padraoComportamental.distribuicao.map((t) => ({
                categoria: t.tipo,
                valor: t.acessos,
                participacaoPct: t.participacaoPct,
              }))}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                    <th className="pb-2">Página de destino</th>
                    <th className="pb-2">Tipo de jornada</th>
                    <th className="pb-2 text-right">Acessos</th>
                  </tr>
                </thead>
                <tbody>
                  {padraoComportamental.topDestinos.map((d) => (
                    <tr key={d.pagina} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                      <td className="py-1.5 truncate max-w-[150px] sm:max-w-none">{d.pagina}</td>
                      <td className="py-1.5" style={{ color: "var(--ds-color-text-secondary)" }}>
                        {d.tipo}
                      </td>
                      <td className="py-1.5 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                        {d.acessos.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashboardSection>
    </div>
  );
}
