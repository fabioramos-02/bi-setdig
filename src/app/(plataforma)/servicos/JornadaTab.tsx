import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { EmptyCard } from "@/components/ds/EmptyCard";
import type { JornadaResumo } from "@/lib/data";

/** Conteúdo da aba "Jornada" — etapas de gerenciamento_jornada, nunca virou
 * visualização própria em nenhum BI antigo (só usada pra detectar duplicidade
 * no cruzamento-carta). Canais de prestação vêm do próprio dado, sem rótulo
 * fixo — o enum do banco não foi confirmado antes de escrever este código.
 * Extraído de ServicosClient pra não estourar 250 linhas/arquivo. */
export function JornadaTab({ jornada }: { jornada: JornadaResumo | null }) {
  if (!jornada || jornada.totalEtapas === 0) {
    return <EmptyCard message="Jornada não cadastrada para as cartas deste inventário." />;
  }

  const canais = jornada.porCanal.map((c) => ({ categoria: c.canal, valor: c.total }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <MetricCard label="Total de etapas" value={jornada.totalEtapas} />
        <MetricCard label="Cartas com jornada cadastrada" value={jornada.servicosComJornada} />
        <MetricCard label="Média de etapas por carta" value={jornada.mediaEtapasPorServico} />
      </div>

      <DashboardSection title="Distribuição por canal de prestação">
        <CategoryDonut dados={canais} />
      </DashboardSection>
    </div>
  );
}
