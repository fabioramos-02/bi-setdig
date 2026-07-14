import { EmptyCard } from "@/components/ds/EmptyCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { labelPagina } from "@/lib/pagina-label";
import type { InsightPagina } from "@/lib/insights";
import type { Pagina } from "@/lib/data";

/** Conteúdo da aba "4. Páginas mais acessadas" — ranking com barra de
 * intensidade (mesmo padrão de Portas de Entrada/Saídas em
 * FluxoNavegacaoTab.tsx) em vez da tabela crua de URL anterior. Extraído de
 * PortalMsClient pra não estourar 250 linhas/arquivo. `rotuloPeriodo` reflete
 * o período que o dado REALMENTE é — intervalo real quando `status` é "ok"
 * (busca ao vivo, ADR-010), snapshot do mês em "fallback". */
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
  if (paginas.length === 0) {
    return <EmptyCard message="Sem páginas acessadas no período." />;
  }

  const ranking = paginas.map((p) => {
    const { label, href } = labelPagina(p.url);
    return { label, valor: p.visitas, href };
  });

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
      {insightPagina && (
        <StoryCard
          anchor={`"${labelPagina(insightPagina.url).label}" é a página mais acessada: ${insightPagina.participacaoPct.toFixed(0)}% das visitas ${rotuloPeriodo} passam por ela.`}
          caption={`${insightPagina.visitas.toLocaleString("pt-BR")} visitas registradas nessa página no período.`}
          comoLer="Ranking das 20 páginas com mais visitas no período selecionado no filtro da sidebar — não é acumulado histórico."
        />
      )}

      <DashboardSection
        title="Ranking de páginas"
        action={<ExportCsvButton rows={paginas} filename="paginas-mais-acessadas" />}
      >
        <ChartLoading status={status} height={260}>
          <RankingBarChart itens={ranking} />
        </ChartLoading>
      </DashboardSection>
    </div>
  );
}
