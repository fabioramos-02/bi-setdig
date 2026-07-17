import { MetricCard } from "@/components/dashboard/MetricCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { LineChart } from "@/components/charts/LineChart";
import type { InsightNavegador, InsightDispositivo, InsightBusca } from "@/lib/insights";
import type { ResumoPeriodo, PontoAgregado } from "@/lib/period-filter";
import type { SaudePortal, ContextoAnual, Recomendacao, Navegacao } from "@/lib/saude-portal";
import type { Pagina, Cidade } from "@/lib/data";
import { municipiosComAcesso, municipiosSemAcesso, MUNICIPIOS_MS } from "@/lib/municipios-ms";
import { labelPagina } from "@/lib/pagina-label";

const COR_NIVEL: Record<SaudePortal["nivel"], string> = {
  saudavel: "var(--ds-color-success)",
  atencao: "var(--ds-color-warning)",
  critico: "var(--ds-color-danger)",
};
const ROTULO_NIVEL: Record<SaudePortal["nivel"], string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  critico: "Crítico",
};

/** Conteúdo da aba "Visão Geral" — pensada pra leitura de gestor, não de
 * analista (ver AGENTS.md "BI de gestão"): resumo executivo → saúde do
 * portal → KPIs → tendência com contexto → destaques → pontos de atenção.
 * Cálculo todo em PortalMsClient/lib; aqui só apresentação. Extraído de
 * PortalMsClient pra não estourar 250 linhas/arquivo. */
export function VisaoGeralTab({
  kpis,
  rotuloPeriodo,
  rotuloSnapshot,
  cidadesAtual,
  tendencia,
  saude,
  resumo,
  contextoAnual,
  navegacao,
  recomendacoes,
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
  cidadesAtual: Cidade[];
  tendencia: PontoAgregado[];
  saude: SaudePortal | null;
  resumo: string | null;
  contextoAnual: ContextoAnual | null;
  navegacao: Navegacao | null;
  recomendacoes: Recomendacao[];
  insightNavegador: InsightNavegador | null;
  insightDispositivo: InsightDispositivo | null;
  paginaTop: Pagina | null;
  insightBusca: InsightBusca | null;
  status: StatusIntervalo;
  onIrPara: (id: string) => void;
}) {
  const semAcesso = municipiosSemAcesso(cidadesAtual);
  const comAcesso = municipiosComAcesso(cidadesAtual);
  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />

      {resumo && (
        <p className="text-sm leading-relaxed" style={{ color: "var(--ds-color-text-primary)" }}>
          {resumo}
        </p>
      )}

      {saude ? (
        <div role="status" className="flex items-baseline gap-2 text-sm min-w-0">
          <span
            aria-hidden
            style={{ backgroundColor: COR_NIVEL[saude.nivel], width: 10, height: 10, borderRadius: "50%", flexShrink: 0 }}
          />
          {/* min-w-0: sem isso o texto longo não encolhe e estoura a página em
              375px, arrastando o gráfico junto (ADR-009). */}
          <p className="min-w-0">
            <span className="font-semibold">{ROTULO_NIVEL[saude.nivel]}</span>{" "}
            <span style={{ color: "var(--ds-color-text-secondary)" }}>— {saude.frase}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Sem comparação histórica disponível para este período.
        </p>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={`Visitas ${rotuloPeriodo}`} value={kpis.visitas} />
        <MetricCard label={`Visitantes únicos ${rotuloPeriodo}`} value={kpis.visitantesUnicos} />
        <MetricCard
          label="Páginas por visita"
          value={navegacao ? navegacao.paginasPorVisita.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}
          sub={
            navegacao?.variacaoAnualPct != null
              ? `${Math.abs(Math.round(navegacao.variacaoAnualPct))}% ${navegacao.variacaoAnualPct >= 0 ? "a mais" : "a menos"} que um ano antes`
              : "quanto o cidadão navega antes de sair"
          }
        />
        <MetricCard
          label="Municípios com acesso"
          value={`${comAcesso.length} de ${MUNICIPIOS_MS.length}`}
          sub="municípios de MS com acesso no período"
        />
      </div>

      {semAcesso.length > 0 && (
        <details>
          <summary className="text-sm cursor-pointer" style={{ color: "var(--ds-color-text-secondary)" }}>
            Ver os {semAcesso.length} municípios sem acesso no período
          </summary>
          <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
            {semAcesso.join(", ")}
          </p>
        </details>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold">
            Tendência de visitas
          </h3>
          <ExportCsvButton rows={tendencia} filename="visitas-por-periodo" />
        </div>
        <LineChart data={tendencia} xKey="rotulo" yKey="visitas" />
        {contextoAnual && (
          <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
            {contextoAnual.frase}
          </p>
        )}
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
              value={paginaTop ? labelPagina(paginaTop.url).label : "—"}
              sub={paginaTop ? `${paginaTop.visitas.toLocaleString("pt-BR")} visitas` : undefined}
            />
          </button>
          <button type="button" onClick={() => onIrPara("busca")} className="text-left">
            <MetricCard
              label={`Termo mais buscado ${rotuloSnapshot}`}
              value={insightBusca?.termo ?? "—"}
              sub={
                insightBusca
                  ? `${insightBusca.buscas.toLocaleString("pt-BR")} buscas — ${insightBusca.participacaoPct.toFixed(0)}% ${insightBusca.baseTotalReal ? "de todas as buscas" : "entre os 20 termos mais procurados"}`
                  : undefined
              }
            />
          </button>
        </div>
      </div>

      {recomendacoes.length > 0 && (
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-3">
            Pontos de atenção
          </h3>
          <ul className="flex flex-col gap-2">
            {recomendacoes.map((r) => (
              <li key={r.texto} className="text-sm">
                {r.abaId ? (
                  <button type="button" onClick={() => onIrPara(r.abaId!)} className="text-left underline">
                    {r.texto}
                  </button>
                ) : (
                  r.texto
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
