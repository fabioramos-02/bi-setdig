import { EmptyCard } from "@/components/ds/EmptyCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { PORTAL_BASE_URL } from "@/components/dashboard/ServiceCardGrid";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { calcularInsightEntrada } from "@/lib/insights";
import type { PaginaEntrada, DominioSaida } from "@/lib/data";

/** "Others" é agregado do Matomo (sem path real) — sem link. "- Others" no fim
 * do label é o mesmo agregado só que preso a um path conhecido — link vai pra
 * página base, sem o sufixo. */
function linkDoPortal(pagina: string): string | undefined {
  if (pagina === "Home (Index)") return PORTAL_BASE_URL;
  if (pagina === "Others" || !pagina.startsWith("/")) return undefined;
  return `${PORTAL_BASE_URL}${pagina.replace(/ - Others$/, "")}`;
}

/** Porta de matomo-analytics-dashboard/views/portal/tab4_jornada.py — 2
 * relatórios leves (não N+1): portas de entrada, saídas pra outros serviços do
 * ecossistema gov. ("Padrão Comportamental" via Transitions foi removido do
 * pipeline — endpoint instável, period=ano custava 12 chamadas sequenciais;
 * Portas de Entrada já responde a mesma pergunta central.) */
export function FluxoNavegacaoTab({
  portasEntrada,
  fugaHub,
  status,
}: {
  portasEntrada: PaginaEntrada[];
  fugaHub: DominioSaida[];
  status: StatusIntervalo;
}) {
  if (portasEntrada.length === 0 && fugaHub.length === 0) {
    return <EmptyCard message="Sem dado de fluxo de navegação ainda — pipeline não extraiu essa amostra." />;
  }

  const insightEntrada = calcularInsightEntrada(portasEntrada);

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
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
    </div>
  );
}
