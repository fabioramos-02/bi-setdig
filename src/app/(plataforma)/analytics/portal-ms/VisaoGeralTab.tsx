import { MetricCard } from "@/components/dashboard/MetricCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { LineChart } from "@/components/charts/LineChart";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import type { InsightBusca } from "@/lib/insights";
import type { ResumoPeriodo, PontoAgregado } from "@/lib/period-filter";
import type { SaudePortal, ContextoAnual, Recomendacao, Navegacao } from "@/lib/saude-portal";
import type { ServicoTop, OrgaoTop } from "@/lib/servicos-portal";
import type { Cidade, ServicoAcessado } from "@/lib/data";
import { municipiosComAcesso, municipiosSemAcesso, MUNICIPIOS_MS } from "@/lib/municipios-ms";

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
 * portal → KPIs → serviços mais procurados → tendência com contexto →
 * destaques → pontos de atenção. Cálculo todo em PortalMsClient/lib; aqui só
 * apresentação. Extraído de PortalMsClient pra não estourar 250 linhas/arquivo. */
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
  insightBusca,
  status,
  onIrPara,
  servicosMaisAcessados,
  servicoTop,
  orgaoTop,
  pctServicoSemOrgao,
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
  insightBusca: InsightBusca | null;
  status: StatusIntervalo;
  onIrPara: (id: string) => void;
  servicosMaisAcessados: ServicoAcessado[];
  servicoTop: ServicoTop | null;
  orgaoTop: OrgaoTop | null;
  pctServicoSemOrgao: number;
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
          <div className="flex flex-wrap gap-2 mt-2">
            {semAcesso.map((m) => (
              <span
                key={m}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: "var(--ds-color-background-muted)", color: "var(--ds-color-text-secondary)" }}
              >
                {m}
              </span>
            ))}
          </div>
        </details>
      )}

      {servicosMaisAcessados.length > 0 && (
        <DashboardSection title="Quais serviços o cidadão mais procurou?">
          <RankingBarChart
            itens={servicosMaisAcessados.slice(0, 5).map((s) => ({
              label: s.servico,
              sublabel: s.orgaoSigla ?? undefined,
              valor: s.visitas,
              href: s.path ? `https://www.ms.gov.br${s.path}` : undefined,
            }))}
          />
          {pctServicoSemOrgao > 0 && (
            <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
              {pctServicoSemOrgao}% desses acessos ainda não puderam ser associados a um órgão responsável.
            </p>
          )}
        </DashboardSection>
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <button type="button" onClick={() => onIrPara("servicos")} className="text-left">
            <MetricCard
              label="Serviço mais procurado"
              value={servicoTop?.nome ?? "—"}
              sub={servicoTop ? `${servicoTop.orgaoSigla ?? "órgão não identificado"} — ${servicoTop.visitas.toLocaleString("pt-BR")} visitas` : undefined}
            />
          </button>
          <button type="button" onClick={() => onIrPara("servicos")} className="text-left">
            <MetricCard
              label="Órgão com mais demanda"
              value={orgaoTop?.orgaoSigla ?? "—"}
              sub={orgaoTop ? `${orgaoTop.pct.toFixed(0)}% da demanda por serviços` : undefined}
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
