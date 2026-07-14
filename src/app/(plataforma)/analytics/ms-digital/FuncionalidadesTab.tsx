import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightServico } from "@/lib/insights";
import type { Servico } from "@/lib/data";

export function FuncionalidadesTab({
  servicos,
  insightServico,
  status,
}: {
  servicos: Servico[];
  insightServico: InsightServico | null;
  status: StatusIntervalo;
}) {
  const itens = servicos.map((s) => ({ label: s.servico, valor: s.acessos }));
  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
      {insightServico && (
        <StoryCard
          anchor={`"${insightServico.servico}" é a funcionalidade mais usada, com ${insightServico.participacaoPct.toFixed(0)}% dos acessos a serviços no período.`}
          caption="Baseado em visualizações de tela (screen_view) dentro do app."
          comoLer="Mostra quais funcionalidades os cidadãos mais utilizam dentro do MS Digital — útil pra priorizar manutenção e evolução dos serviços com mais uso real. Barra mais longa e mais escura = mais acessos."
        />
      )}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold">
            Ranking de serviços (top 15)
          </h3>
          <ExportCsvButton rows={servicos} filename="ga4-servicos" />
        </div>
        <ChartLoading status={status} height={260}>
          <RankingBarChart itens={itens} />
        </ChartLoading>
      </div>
    </div>
  );
}
