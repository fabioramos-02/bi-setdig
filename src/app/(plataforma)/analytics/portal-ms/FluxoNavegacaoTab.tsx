import { EmptyCard } from "@/components/ds/EmptyCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { PORTAL_BASE_URL } from "@/components/dashboard/ServiceCardGrid";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { calcularInsightEntrada } from "@/lib/insights";
import type { PaginaEntrada, DominioSaida, PadraoComportamental } from "@/lib/data";

/** "Others" é agregado do Matomo (sem path real) — sem link. "- Others" no fim
 * do label é o mesmo agregado só que preso a um path conhecido — link vai pra
 * página base, sem o sufixo. */
function linkDoPortal(pagina: string): string | undefined {
  if (pagina === "Home (Index)") return PORTAL_BASE_URL;
  if (pagina === "Others" || !pagina.startsWith("/")) return undefined;
  return `${PORTAL_BASE_URL}${pagina.replace(/ - Others$/, "")}`;
}

/** Porta de matomo-analytics-dashboard/views/portal/tab4_jornada.py — 3
 * relatórios leves (não N+1): portas de entrada, saídas pra outros serviços do
 * ecossistema gov, e padrão comportamental a partir da Home. */
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

  const insightEntrada = calcularInsightEntrada(portasEntrada);

  return (
    <div className="flex flex-col gap-6">
      {insightEntrada && (
        <StoryCard
          anchor={`"${insightEntrada.pagina}" é a porta de entrada mais usada: ${insightEntrada.participacaoPct.toFixed(0)}% de quem chega direto ao portal cai nela.`}
          caption={`${insightEntrada.entradas.toLocaleString("pt-BR")} entradas registradas nessa página no período.`}
          comoLer="Entrada é a primeira página que a pessoa abre na visita. Saída é pra qual outro serviço do governo ela segue depois. Os números mostram o período atual (dia/semana/mês/ano do filtro ao lado) — não mudam com a data de referência da sidebar."
        />
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <DashboardSection title="Portas de Entrada (Landing Pages)">
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Por onde os cidadãos começaram a navegação?
          </p>
          {portasEntrada.length === 0 ? (
            <EmptyCard message="Sem entradas no período." />
          ) : (
            <RankingBarChart
              cor="var(--ds-color-green-600)"
              itens={portasEntrada.map((p) => ({ label: p.pagina, valor: p.entradas, href: linkDoPortal(p.pagina) }))}
            />
          )}
        </DashboardSection>

        <DashboardSection title="Saídas para outros serviços">
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Pra onde os cidadãos seguem ao sair do portal? Domínios como Detran e Sefaz são outros serviços do governo —
            é continuidade da jornada, não abandono.
          </p>
          {fugaHub.length === 0 ? (
            <EmptyCard message="Sem saídas no período." />
          ) : (
            <RankingBarChart
              cor="var(--ds-color-red-600)"
              itens={fugaHub.map((f) => ({ label: f.dominio, valor: f.saidas, href: `https://${f.dominio}` }))}
            />
          )}
        </DashboardSection>
      </div>

      <DashboardSection title="Padrão Comportamental: a partir da Página Principal">
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
                  {padraoComportamental.topDestinos.map((d) => {
                    const href = linkDoPortal(d.pagina);
                    return (
                      <tr key={d.pagina} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                        <td className="py-1.5 truncate max-w-[150px] sm:max-w-none">
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                              style={{ color: "var(--ds-color-primary-600)" }}
                            >
                              {d.pagina}
                            </a>
                          ) : (
                            d.pagina
                          )}
                        </td>
                        <td className="py-1.5" style={{ color: "var(--ds-color-text-secondary)" }}>
                          {d.tipo}
                        </td>
                        <td className="py-1.5 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                          {d.acessos.toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashboardSection>
    </div>
  );
}
