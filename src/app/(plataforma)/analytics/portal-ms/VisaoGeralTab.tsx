import { MetricCard } from "@/components/dashboard/MetricCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { LineChart } from "@/components/charts/LineChart";
import type { InsightVisitas, InsightNavegador, InsightDispositivo, InsightBusca } from "@/lib/insights";
import type { ResumoPeriodo, PontoAgregado } from "@/lib/period-filter";
import type { Pagina } from "@/lib/data";

/** Conteúdo da aba "Visão Geral" — resumo executivo: tendência + KPIs do
 * período + 1 destaque de cada domínio (navegador/dispositivo/página/busca
 * líderes), com link direto pra aba de detalhe. Extraído de PortalMsClient
 * pra não estourar 250 linhas/arquivo. */
export function VisaoGeralTab({
  kpis,
  rotuloPeriodo,
  cidadesCount,
  tendencia,
  insightVisitas,
  insightNavegador,
  insightDispositivo,
  paginaTop,
  insightBusca,
  onIrPara,
}: {
  kpis: ResumoPeriodo;
  rotuloPeriodo: string;
  cidadesCount: number;
  tendencia: PontoAgregado[];
  insightVisitas: InsightVisitas;
  insightNavegador: InsightNavegador | null;
  insightDispositivo: InsightDispositivo | null;
  paginaTop: Pagina | null;
  insightBusca: InsightBusca | null;
  onIrPara: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={`Visitas ${rotuloPeriodo}`} value={kpis.visitas} />
        <MetricCard label={`Visitantes únicos ${rotuloPeriodo}`} value={kpis.visitantesUnicos} />
        <MetricCard label={`Ações ${rotuloPeriodo}`} value={kpis.acoes} />
        <MetricCard label="Cidades com acesso (MS)" value={cidadesCount} sub="de 78 municípios" />
      </div>

      {insightVisitas.variacaoPct !== null && (
        <StoryCard
          anchor={
            insightVisitas.variacaoPct >= 0
              ? `As visitas subiram ${insightVisitas.variacaoPct.toFixed(0)}% na última semana em relação à anterior.`
              : `As visitas caíram ${Math.abs(insightVisitas.variacaoPct).toFixed(0)}% na última semana em relação à anterior.`
          }
          caption={`Média de ${Math.round(insightVisitas.mediaDiaria).toLocaleString("pt-BR")} visitas/dia nos últimos 30 dias.`}
          comoLer="Compara a soma de visitas dos últimos 7 dias com os 7 dias anteriores — varia com dia da semana e feriados, não é um indicador isolado de qualidade do portal."
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold">
            Tendência de visitas
          </h3>
          <ExportCsvButton rows={tendencia} filename="visitas-por-periodo" />
        </div>
        <LineChart data={tendencia} xKey="rotulo" yKey="visitas" />
      </div>

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
              label="Página mais acessada (mês)"
              value={paginaTop ? paginaTop.visitas : "—"}
              sub={paginaTop?.url}
            />
          </button>
          <button type="button" onClick={() => onIrPara("busca")} className="text-left">
            <MetricCard
              label="Termo mais buscado (mês)"
              value={insightBusca?.termo ?? "—"}
              sub={insightBusca ? `${insightBusca.buscas.toLocaleString("pt-BR")} buscas` : undefined}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
