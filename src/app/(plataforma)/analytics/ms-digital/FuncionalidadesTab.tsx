import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { CategoryDonut, type FatiaCategoria } from "@/components/charts/CategoryDonut";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightServico, InsightCategoria } from "@/lib/insights";
import type { Servico } from "@/lib/data";

/** Amplo → específico: categoria (área do app) primeiro, depois o serviço
 * individual dentro dela — ver lib/servico-app-classifier.ts pra como o GA4
 * bruto (screen_view sem hierarquia) vira essas duas listas separadas. */
export function FuncionalidadesTab({
  servicosFolha,
  categorias,
  naoIdentificadoPct,
  insightServico,
  insightCategoria,
  status,
}: {
  servicosFolha: Servico[];
  categorias: FatiaCategoria[];
  naoIdentificadoPct: number;
  insightServico: InsightServico | null;
  insightCategoria: InsightCategoria | null;
  status: StatusIntervalo;
}) {
  const itens = servicosFolha.map((s) => ({ label: s.servico, valor: s.acessos }));
  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />

      {insightCategoria && (
        <StoryCard
          anchor={`"${insightCategoria.categoria}" é a área mais usada do app, com ${insightCategoria.participacaoPct.toFixed(0)}% dos acessos classificados no período.`}
          caption="Soma quem abriu o menu dessa área com quem usou qualquer serviço dela."
          comoLer="Cada área agrupa vários serviços (ex. Servidor Público reúne Contracheque, Portal do Servidor etc.) — mostra onde priorizar manutenção em nível mais amplo antes de olhar serviço por serviço."
        />
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold">
            Categorias mais usadas
          </h3>
          <ExportCsvButton rows={categorias} filename="ga4-categorias" />
        </div>
        <ChartLoading status={status} height={260}>
          <CategoryDonut dados={categorias} />
        </ChartLoading>
      </div>

      {insightServico && (
        <StoryCard
          anchor={`"${insightServico.servico}" é o serviço individual mais usado, com ${insightServico.participacaoPct.toFixed(0)}% dos acessos a serviços no período.`}
          caption="Baseado em visualizações de tela (screen_view) dentro do app, já sem contar telas de menu/categoria."
          comoLer="Mostra quais serviços (não categorias) os cidadãos mais utilizam dentro do MS Digital — útil pra priorizar manutenção e evolução dos serviços com mais uso real. Barra mais longa e mais escura = mais acessos."
        />
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold">
            Ranking de serviços (top 15)
          </h3>
          <ExportCsvButton rows={servicosFolha} filename="ga4-servicos" />
        </div>
        <ChartLoading status={status} height={260}>
          <RankingBarChart itens={itens.slice(0, 15)} />
        </ChartLoading>
        {naoIdentificadoPct > 3 && (
          <p className="mt-2 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            {naoIdentificadoPct.toFixed(0)}% dos acessos são a telas de submenu que não puderam ser identificadas como
            categoria nem serviço individual — não entram em nenhum dos dois rankings acima.
          </p>
        )}
      </div>
    </div>
  );
}
