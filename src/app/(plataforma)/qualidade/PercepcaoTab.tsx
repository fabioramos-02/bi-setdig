import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { BarChart } from "@/components/charts/BarChart";
import { calcularInsightPercepcao } from "@/lib/insights";
import type { PercepcaoResumo } from "@/lib/data";

const NOTAS = ["1", "2", "3", "4", "5"] as const;

/** Aba "Qualidade": o cidadão entende e gosta do serviço — pergunta
 * diferente de "tem erro técnico" (essa é a aba Erros). CSAT (nota 1-5) +
 * clareza da descrição da carta. */
export function PercepcaoTab({ percepcao }: { percepcao: PercepcaoResumo | null }) {
  const insightPercepcao = calcularInsightPercepcao(percepcao);
  const csatData = percepcao
    ? NOTAS.map((n) => ({ nota: `${n} estrela${n === "1" ? "" : "s"}`, total: percepcao.csatDistribuicao[n] }))
    : [];

  if (!percepcao || !insightPercepcao) {
    return (
      <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
        Ainda não há dado de satisfação do cidadão disponível.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardSection title="O que o cidadão acha do serviço">
        <BarChart data={csatData} xKey="nota" yKey="total" height={220} />
      </DashboardSection>
      <StoryCard
        anchor={`Nota média do cidadão pro serviço: ${insightPercepcao.csatMedia.toLocaleString("pt-BR")} de 5, em ${insightPercepcao.totalVotos.toLocaleString("pt-BR")} avaliações.`}
        caption={`Em ${insightPercepcao.clarezaPositivaPct.toFixed(0)}% das vezes, o cidadão achou a descrição do serviço clara.`}
        comoLer="A nota mede se o cidadão gostou do atendimento; a clareza mede se ele entendeu a explicação do serviço antes de usar. São perguntas diferentes — um serviço pode funcionar bem e ainda assim ter uma descrição confusa."
      />
    </div>
  );
}
