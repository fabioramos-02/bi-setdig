import { BarChart } from "@/components/charts/BarChart";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { rotuloEstagioFunil } from "@/lib/insights";
import type { InsightFunil } from "@/lib/insights";
import type { EventoFunil } from "@/lib/data";

/** Peça central de storytelling do domínio — funil de aquisição -> ativação
 * -> navegação -> retenção, com a maior queda entre estágios explicada (ver
 * calcularInsightFunil em lib/insights.ts, porta de tab4_jornada.py). */
export function JornadaTab({
  funil,
  insightFunil,
  status,
}: {
  funil: EventoFunil[];
  insightFunil: InsightFunil | null;
  status: StatusIntervalo;
}) {
  const dadosFunil = funil.map((f) => ({ estagio: rotuloEstagioFunil(f.evento), usuarios: f.usuarios }));

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
      <div>
        <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
          Funil de engajamento: aquisição → ativação → navegação → retenção
        </h3>
        <ChartLoading status={status} height={280}>
          <BarChart data={dadosFunil} xKey="estagio" yKey="usuarios" height={280} />
        </ChartLoading>
      </div>

      {insightFunil && (
        <StoryCard
          anchor={`O maior ponto de abandono é entre "${rotuloEstagioFunil(insightFunil.estagioAtual)}" e "${rotuloEstagioFunil(
            insightFunil.estagioProximo
          )}", onde ${Math.abs(insightFunil.usuariosPerdidos).toLocaleString("pt-BR")} usuários ${
            insightFunil.usuariosPerdidos >= 0 ? "somem" : "aparecem a mais"
          } (${insightFunil.quedaPct.toFixed(0)}%).`}
          caption={insightFunil.interpretacao}
          comoLer="Cada estágio conta usuários únicos que dispararam aquele evento no período — não é uma jornada estritamente sequencial por pessoa, mas revela onde o volume de gente cai mais entre uma etapa e a próxima."
        />
      )}
    </div>
  );
}
