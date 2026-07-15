import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { LineChart } from "@/components/charts/LineChart";
import { type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightNavegador, InsightDispositivo, InsightPagina, InsightBusca } from "@/lib/insights";
import type { VisitaDiaria } from "@/lib/data";

/** Conteúdo da aba "1. Visão Geral" — KPIs do período + tendência + 1
 * destaque de cada domínio (navegador/dispositivo/página/busca líderes), com
 * link direto pra aba de detalhe. Espelha VisaoGeralTab do Portal Único, sem
 * a comparação com período anterior (exigiria um 2º fetch de range histórico
 * que não faz parte do escopo de um site do catálogo). */
export function VisaoGeralTab({
  tendencia,
  rotuloPeriodo,
  insightNavegador,
  insightDispositivo,
  insightPagina,
  insightBusca,
  status,
  onIrPara,
}: {
  tendencia: VisitaDiaria[];
  rotuloPeriodo: string;
  insightNavegador: InsightNavegador | null;
  insightDispositivo: InsightDispositivo | null;
  insightPagina: InsightPagina | null;
  insightBusca: InsightBusca | null;
  status: StatusIntervalo;
  onIrPara: (id: string) => void;
}) {
  const visitas = tendencia.reduce((acc, d) => acc + d.visitas, 0);
  const visitantesUnicos = tendencia.reduce((acc, d) => acc + d.visitantesUnicos, 0);
  const acoes = tendencia.reduce((acc, d) => acc + d.acoes, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <MetricCard label={`Visitas ${rotuloPeriodo}`} value={visitas} />
        <MetricCard label={`Visitantes únicos ${rotuloPeriodo}`} value={visitantesUnicos} />
        <MetricCard label={`Ações ${rotuloPeriodo}`} value={acoes} />
      </div>

      {tendencia.length === 0 && status !== "carregando" ? (
        <StoryCard
          anchor="Sem dados suficientes nesse período."
          caption="Esse site não teve tráfego registrado nesse período."
          comoLer="Troque o período no filtro da barra lateral pra tentar um intervalo maior."
        />
      ) : (
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Tendência de visitas
          </h3>
          <ChartLoading status={status} height={280}>
            <LineChart data={tendencia} xKey="data" yKey="visitas" height={280} />
          </ChartLoading>
        </div>
      )}

      <div>
        <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-3">
          Destaques
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => onIrPara("perfil")} className="text-left">
            <MetricCard
              label="Navegador líder"
              value={insightNavegador?.navegador ?? "—"}
              sub={insightNavegador ? `${insightNavegador.participacaoPct.toFixed(0)}% dos acessos` : undefined}
            />
          </button>
          <button type="button" onClick={() => onIrPara("perfil")} className="text-left">
            <MetricCard
              label="Dispositivo líder"
              value={insightDispositivo?.dispositivo ?? "—"}
              sub={insightDispositivo ? `${insightDispositivo.participacaoPct.toFixed(0)}% dos acessos` : undefined}
            />
          </button>
          <button type="button" onClick={() => onIrPara("paginas")} className="text-left">
            <MetricCard
              label={`Página mais acessada ${rotuloPeriodo}`}
              value={insightPagina ? insightPagina.visitas : "—"}
              sub={insightPagina?.url}
            />
          </button>
          <button type="button" onClick={() => onIrPara("busca")} className="text-left">
            <MetricCard
              label={`Termo mais buscado ${rotuloPeriodo}`}
              value={insightBusca?.termo ?? "—"}
              sub={insightBusca ? `${insightBusca.buscas.toLocaleString("pt-BR")} buscas` : undefined}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
