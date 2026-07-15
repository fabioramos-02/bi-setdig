import { EmptyCard } from "@/components/ds/EmptyCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { labelPagina } from "@/lib/pagina-label";
import type { InsightPagina } from "@/lib/insights";
import type { Pagina } from "@/lib/data";

/** Conteúdo da aba "4. Páginas mais acessadas" — mesma estrutura de
 * portal-ms/PaginasTab.tsx. Cópia local (ver PerfilCidadaoTab.tsx pro porquê).
 * `labelPagina` despe o prefixo ms.gov.br/www.ms.gov.br — funciona bem pro
 * portal principal; nos demais 143 subdomínios cai no fallback (label = URL
 * completa), mesmo comportamento de antes desta aba existir. */
export function PaginasTab({
  paginas,
  rotuloPeriodo,
  insightPagina,
  status,
}: {
  paginas: Pagina[];
  rotuloPeriodo: string;
  insightPagina: InsightPagina | null;
  status: StatusIntervalo;
}) {
  // Ao contrário do portal-ms (sempre tem snapshot como fallback), aqui o
  // array vem vazio de verdade enquanto o fetch ainda não resolveu — sem essa
  // checagem de status, o EmptyCard "pisca" antes do skeleton aparecer.
  if (paginas.length === 0 && status !== "carregando") {
    return <EmptyCard message="Sem páginas acessadas no período." />;
  }

  const ranking = paginas.map((p) => {
    const { label, href } = labelPagina(p.url);
    return { label, valor: p.visitas, href };
  });

  return (
    <div className="flex flex-col gap-6">
      {insightPagina && (
        <StoryCard
          anchor={`"${labelPagina(insightPagina.url).label}" é a página mais acessada: ${insightPagina.participacaoPct.toFixed(0)}% das visitas ${rotuloPeriodo} passam por ela.`}
          caption={`${insightPagina.visitas.toLocaleString("pt-BR")} visitas registradas nessa página no período.`}
          comoLer="Ranking das 20 páginas com mais visitas no período escolhido no filtro de período — não é um acumulado histórico."
        />
      )}

      <DashboardSection title="Ranking de páginas">
        <ChartLoading status={status} height={260}>
          <RankingBarChart itens={ranking} />
        </ChartLoading>
      </DashboardSection>
    </div>
  );
}
