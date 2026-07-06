import { BarChart } from "@/components/charts/BarChart";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import type { InsightServico } from "@/lib/insights";
import type { Servico } from "@/lib/data";

export function FuncionalidadesTab({ servicos, insightServico }: { servicos: Servico[]; insightServico: InsightServico | null }) {
  return (
    <div className="flex flex-col gap-6">
      {insightServico && (
        <StoryCard
          anchor={`"${insightServico.servico}" é a funcionalidade mais usada, com ${insightServico.participacaoPct.toFixed(0)}% dos acessos a serviços nos últimos 30 dias.`}
          caption="Baseado em visualizações de tela (screen_view) dentro do app."
          comoLer="Mostra quais funcionalidades os cidadãos mais utilizam dentro do MS Digital — útil pra priorizar manutenção e evolução dos serviços com mais uso real."
        />
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold">
            Ranking de serviços (top 15)
          </h3>
          <ExportCsvButton rows={servicos} filename="ga4-servicos" />
        </div>
        <BarChart data={servicos} xKey="servico" yKey="acessos" height={360} />
      </div>
    </div>
  );
}
