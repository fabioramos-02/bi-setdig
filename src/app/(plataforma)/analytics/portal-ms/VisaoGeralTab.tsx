import { TrendingUp, TrendingDown, Search, Landmark, MapPin } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { LineChart } from "@/components/charts/LineChart";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { ChoroplethMap } from "@/components/charts/ChoroplethMap";
import { BarChart } from "@/components/charts/BarChart";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightBusca } from "@/lib/insights";
import type { ResumoPeriodo, PontoAgregado } from "@/lib/period-filter";
import type { SaudePortal, ContextoAnual, Recomendacao } from "@/lib/saude-portal";
import type { ServicoTop, OrgaoTop } from "@/lib/servicos-portal";
import type { Cidade, ServicoAcessado } from "@/lib/data";
import { municipiosComAcesso, municipiosSemAcesso, MUNICIPIOS_MS, slugIbge } from "@/lib/municipios-ms";

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

const ESTILO_HEADER = { color: "var(--ds-color-text-secondary)" } as const;

/** Conteúdo da aba "Visão Geral" — lida como um Executive Briefing (AGENTS.md
 * "BI de gestão"): Situação Geral (o que aconteceu) → Achados (o que
 * significa) → Alcance no território (onde chega/não chega) → Pontos de
 * atenção (onde agir). Cálculo todo em PortalMsClient/lib; aqui só
 * apresentação. Extraído de PortalMsClient pra não estourar 250 linhas. */
export function VisaoGeralTab({
  kpis,
  cidadesAtual,
  tendencia,
  saude,
  contextoAnual,
  recomendacoes,
  insightBusca,
  status,
  onIrPara,
  servicosMaisAcessados,
  servicoTop,
  orgaoTop,
  pctServicoSemOrgao,
  fraseNavegacaoPerfil,
  matchRate,
}: {
  kpis: ResumoPeriodo;
  cidadesAtual: Cidade[];
  tendencia: PontoAgregado[];
  saude: SaudePortal | null;
  contextoAnual: ContextoAnual | null;
  recomendacoes: Recomendacao[];
  insightBusca: InsightBusca | null;
  status: StatusIntervalo;
  onIrPara: (id: string) => void;
  servicosMaisAcessados: ServicoAcessado[];
  servicoTop: ServicoTop | null;
  orgaoTop: OrgaoTop | null;
  pctServicoSemOrgao: number;
  fraseNavegacaoPerfil: string | null;
  matchRate: number;
}) {
  const semAcesso = municipiosSemAcesso(cidadesAtual);
  const comAcesso = municipiosComAcesso(cidadesAtual);
  return (
    <div className="flex flex-col gap-4">
      <AvisoSnapshotAproximado status={status} />

      <div>
        <h3 style={ESTILO_HEADER} className="text-sm font-semibold mb-3">
          Situação Geral
        </h3>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={saude && saude.variacaoPct < 0 ? TrendingDown : TrendingUp}
            label="Desempenho"
            value={kpis.visitas}
            sub={saude ? `${saude.variacaoPct >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(saude.variacaoPct))}% vs. ritmo típico` : undefined}
          />
          <MetricCard
            icon={Search}
            label="Interesse dos cidadãos"
            value={insightBusca?.termo ?? "—"}
            sub={servicoTop ? `Serviço mais procurado: ${servicoTop.nome}` : undefined}
          />
          <MetricCard
            icon={Landmark}
            label="Demanda por órgãos"
            value={orgaoTop?.orgaoSigla ?? "—"}
            sub={orgaoTop ? `${orgaoTop.pct.toFixed(0)}% dos acessos a serviços` : undefined}
          />
          <MetricCard
            icon={MapPin}
            label="Alcance"
            value={`${comAcesso.length} de ${MUNICIPIOS_MS.length}`}
            sub="municípios com acesso no período"
          />
        </div>

        {saude ? (
          <div role="status" className="flex items-baseline gap-2 text-sm min-w-0 mt-2">
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
          <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
            Sem comparação histórica disponível para este período.
          </p>
        )}

        <div className="mt-3 break-inside-avoid">
          <div className="flex items-center justify-between mb-2">
            <h3 style={ESTILO_HEADER} className="text-sm font-semibold">
              Tendência de visitas
            </h3>
            <ExportCsvButton rows={tendencia} filename="visitas-por-periodo" />
          </div>
          <LineChart data={tendencia} xKey="rotulo" yKey="visitas" height={170} />
          {contextoAnual && (
            <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
              {contextoAnual.frase}
            </p>
          )}
        </div>
      </div>

      <div className="break-inside-avoid">
        <h3 style={ESTILO_HEADER} className="text-sm font-semibold mb-2">
          Achados
        </h3>

        {servicosMaisAcessados.length > 0 && (
          <>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--ds-color-text-primary)" }}>
              Quais serviços o cidadão mais procurou?
            </p>
            <RankingBarChart
              compact
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
          </>
        )}

        {fraseNavegacaoPerfil && (
          <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
            {fraseNavegacaoPerfil}
          </p>
        )}
      </div>

      <div className="break-inside-avoid">
        <h3 style={ESTILO_HEADER} className="text-sm font-semibold mb-2">
          Alcance no território
        </h3>
        <p className="text-sm font-semibold mb-2" style={{ color: "var(--ds-color-text-primary)" }}>
          Quais regiões acessam o portal?
        </p>

        {/* Mapa com largura ampliada para melhor visualização das regiões. */}
        <div className="max-w-lg mx-auto">
          <ChartLoading status={status} height={400}>
            {matchRate > 0.5 ? (
              <ChoroplethMap cidades={cidadesAtual} />
            ) : (
              <BarChart data={cidadesAtual.slice(0, 15)} xKey="cidade" yKey="visitas" height={400} />
            )}
          </ChartLoading>
        </div>
        <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
          Tons mais fortes = mais acessos. As áreas claras são municípios de onde pouca ou nenhuma
          pessoa acessou o portal no período.
        </p>

        {semAcesso.length > 0 && (
          <details className="mt-3 print-expandir">
            <summary className="text-sm cursor-pointer" style={{ color: "var(--ds-color-text-secondary)" }}>
              Ver os {semAcesso.length} municípios sem acesso no período
            </summary>
            <div className="flex flex-wrap gap-2 mt-2">
              {semAcesso.map((m) => (
                <a
                  key={m}
                  href={`https://cidades.ibge.gov.br/brasil/ms/${slugIbge(m)}/panorama`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 rounded-full hover:underline"
                  style={{ background: "var(--ds-color-background-muted)", color: "var(--ds-color-text-secondary)" }}
                >
                  {m}
                </a>
              ))}
            </div>
          </details>
        )}
      </div>

      {recomendacoes.length > 0 && (
        <div>
          <h3 style={ESTILO_HEADER} className="text-sm font-semibold mb-3">
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
