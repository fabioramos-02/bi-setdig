import { MetricCard } from "@/components/dashboard/MetricCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
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
  rotuloSnapshot,
  cidadesCount,
  tendencia,
  insightVisitas,
  insightNavegador,
  insightDispositivo,
  paginaTop,
  insightBusca,
  status,
  onIrPara,
}: {
  kpis: ResumoPeriodo;
  rotuloPeriodo: string;
  rotuloSnapshot: string;
  cidadesCount: number;
  tendencia: PontoAgregado[];
  insightVisitas: InsightVisitas | null;
  insightNavegador: InsightNavegador | null;
  insightDispositivo: InsightDispositivo | null;
  paginaTop: Pagina | null;
  insightBusca: InsightBusca | null;
  status: StatusIntervalo;
  onIrPara: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={`Visitas ${rotuloPeriodo}`} value={kpis.visitas} />
        <MetricCard label={`Visitantes únicos ${rotuloPeriodo}`} value={kpis.visitantesUnicos} />
        <MetricCard label={`Ações ${rotuloPeriodo}`} value={kpis.acoes} />
        <MetricCard label="Cidades com acesso (MS)" value={cidadesCount} sub="de 78 municípios" />
      </div>

      {insightVisitas && insightVisitas.variacaoPct !== null && (
        <StoryCard
          anchor={`${insightVisitas.rotuloAtual} teve ${Math.abs(insightVisitas.variacaoPct).toFixed(0)}% ${
            insightVisitas.variacaoPct >= 0 ? "a mais" : "a menos"
          } de visitas do que ${insightVisitas.rotuloAnterior}.`}
          caption={`${insightVisitas.visitasAtual.toLocaleString("pt-BR")} visitas agora, contra ${insightVisitas.visitasAnterior.toLocaleString("pt-BR")} antes.`}
          comoLer="Comparamos com o período anterior de mesmo tamanho. Feriados e fins de semana podem mudar esse número — sozinho, ele não diz se o portal está indo bem ou mal."
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
              label={`Página mais acessada ${rotuloSnapshot}`}
              value={paginaTop ? paginaTop.visitas : "—"}
              sub={paginaTop?.url}
            />
          </button>
          <button type="button" onClick={() => onIrPara("busca")} className="text-left">
            <MetricCard
              label={`Termo mais buscado ${rotuloSnapshot}`}
              value={insightBusca?.termo ?? "—"}
              sub={insightBusca ? `${insightBusca.buscas.toLocaleString("pt-BR")} buscas` : undefined}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
