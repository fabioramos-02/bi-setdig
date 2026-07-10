import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { BarChart } from "@/components/charts/BarChart";
import { corCategorica } from "@/lib/categorical-palette";
import { NIVEL_MATURIDADE_LABEL } from "@/lib/servicos";
import type { InventarioResumo } from "@/lib/data";

/** Conteúdo da aba "Visão Geral" do inventário de cartas — KPIs de cadastro
 * + distribuição por canal e por nível de maturidade heurístico. Extraído
 * de ServicosClient pra não estourar 250 linhas/arquivo. */
export function VisaoGeralTab({ resumo }: { resumo: InventarioResumo }) {
  const canal = [
    { categoria: "Presencial", valor: resumo.presenciais },
    { categoria: "Digital", valor: resumo.digitais - resumo.hibridos },
    { categoria: "Híbrido", valor: resumo.hibridos },
  ].filter((c) => c.valor > 0);

  const maturidadeData = resumo.maturidade.map((m) => ({
    nivel: `${m.nivel} — ${NIVEL_MATURIDADE_LABEL[m.nivel]}`,
    total: m.total,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total de cartas" value={resumo.total} />
        <MetricCard label="Ativas" value={resumo.ativos} sub={`${resumo.inativos} inativas`} />
        <MetricCard label="% Digital" value={`${resumo.percentDigital.toFixed(1)}%`} sub="entre as ativas" />
        <MetricCard label="Híbridas" value={resumo.hibridos} sub="digital + agendável/externo" />
      </div>

      <StoryCard
        anchor={`${resumo.percentDigital.toFixed(0)}% das cartas ativas já têm algum caminho digital de execução.`}
        caption={`${resumo.digitais} de ${resumo.ativos} cartas ativas. ${resumo.classificadas} têm nível de maturidade revisado por rubrica (com justificativa); o restante é aproximação por campos de cadastro.`}
        comoLer="Nível de maturidade combina duas fontes: para IAGRO, DETRAN e SEAD, usamos uma classificação manual carta a carta (rubrica 0-4, com justificativa). Para o restante, aproximamos a partir dos campos de cadastro (digital, online, agendável, acesso externo) — é um sinal, não uma avaliação definitiva de cada serviço. Veja a aba 'Relação de Cartas' para saber a origem de cada uma."
      />

      <DashboardSection title="Canal de atendimento">
        <CategoryDonut dados={canal} />
      </DashboardSection>

      <DashboardSection title="Distribuição por nível de maturidade digital (0-4)">
        <BarChart data={maturidadeData} xKey="nivel" yKey="total" corPorIndice={corCategorica} />
      </DashboardSection>
    </div>
  );
}
