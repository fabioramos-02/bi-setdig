import { BarChart } from "@/components/charts/BarChart";
import { CadenciaAcessoSegmentos } from "@/components/charts/CadenciaAcessoSegmentos";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { SnapshotBadge } from "@/components/dashboard/SnapshotBadge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { BannerPeriodo } from "@/components/dashboard/BannerPeriodo";
import { RecenciaContasCard } from "@/components/dashboard/RecenciaContasCard";
import { FaixasDeAcessoPorTipoCard } from "@/components/dashboard/FaixasDeAcessoPorTipoCard";
import {
  AvisoSnapshotAproximado,
  type StatusIntervalo,
} from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { rotuloEstagioFunil } from "@/lib/insights";
import type { InsightFunil } from "@/lib/insights";
import type {
  EventoFunil,
  FrequenciaAcesso,
  FaixaAcesso,
  FaixaAcessoPorTipo,
} from "@/lib/data";
import {
  interpretaStickiness,
  saudeJornada,
  situacaoJornada,
  pontosAtencaoJornada,
  kpisJornada,
} from "@/lib/insights-jornada";
import {
  fraseAdocaoGovBrPorFaixa,
  tituloAdocaoGovBrPorFaixa,
} from "@/lib/insights-contas";

const CORES_SAUDE = {
  verde: "var(--ds-color-success)",
  amarelo: "var(--ds-color-warning)",
  vermelho: "var(--ds-color-danger)",
} as const;

/** Aba "Jornada do Usuário" em formato Executive Briefing.
 *  Ordem: banner período → situação geral + semáforo → KPIs → funil (dinâmico)
 *  → cadência (snapshot) → recência (snapshot) → adoção Gov.BR (snapshot) →
 *  pontos de atenção. Cada bloco snapshot exibe sua data de extração;
 *  o banner só cobre blocos dinâmicos. */
export function JornadaTab({
  funil,
  insightFunil,
  status,
  frequenciaAcesso,
  snapshotFrequenciaEm,
  faixasDeAcesso,
  faixasDeAcessoPorTipo,
  novos,
  recorrentes,
  rotuloPeriodo,
  rotuloPeriodoResolvido,
}: {
  funil: EventoFunil[];
  insightFunil: InsightFunil | null;
  status: StatusIntervalo;
  frequenciaAcesso: FrequenciaAcesso | null;
  snapshotFrequenciaEm: string | null;
  faixasDeAcesso: FaixaAcesso[];
  faixasDeAcessoPorTipo: FaixaAcessoPorTipo[];
  novos: number;
  recorrentes: number;
  rotuloPeriodo: string;
  rotuloPeriodoResolvido: string;
}) {
  const saude = saudeJornada(frequenciaAcesso, faixasDeAcesso);
  const situacao = situacaoJornada(insightFunil, frequenciaAcesso, faixasDeAcesso);
  const alertas = pontosAtencaoJornada(insightFunil, frequenciaAcesso, faixasDeAcesso);
  const kpis = kpisJornada(novos, recorrentes, rotuloPeriodo, insightFunil, frequenciaAcesso);

  const dadosFunil = funil.map((f) => ({
    estagio: rotuloEstagioFunil(f.evento),
    usuarios: f.usuarios,
  }));

  return (
    <div className="flex flex-col gap-6">
      <BannerPeriodo rotulo={rotuloPeriodoResolvido || "período atual"} />
      <AvisoSnapshotAproximado status={status} />

      {/* 1. Situação geral + semáforo (visão do gestor em 5 segundos) */}
      <DashboardSection title="Situação geral">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div
            aria-hidden
            style={{ background: CORES_SAUDE[saude.nivel] }}
            className="w-3 h-3 rounded-full mt-2 shrink-0"
          />
          <div>
            <p
              style={{ color: "var(--ds-color-text-primary)" }}
              className="text-base font-semibold"
            >
              {saude.texto}
            </p>
            <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm mt-2">
              {situacao}
            </p>
          </div>
        </div>
      </DashboardSection>

      {/* 2. KPIs do topo — 4 cartões que respondem "quem usa e como estão voltando" */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={`Usuários ativos ${kpis.rotuloUsuarios}`}
          value={kpis.usuariosAtivos}
          sub="novos + recorrentes no período"
        />
        <MetricCard
          label="Recorrentes"
          value={kpis.recorrentesPct !== null ? `${kpis.recorrentesPct.toFixed(0)}%` : "—"}
          sub={
            kpis.recorrentesPct !== null
              ? `${kpis.recorrentes.toLocaleString("pt-BR")} de ${kpis.usuariosAtivos.toLocaleString("pt-BR")}`
              : "sem dados no período"
          }
        />
        <MetricCard
          label="Maior abandono"
          value={
            kpis.maiorAbandonoPct !== null && kpis.maiorAbandonoEstagio
              ? `${kpis.maiorAbandonoPct.toFixed(0)}%`
              : "—"
          }
          sub={kpis.maiorAbandonoEstagio ? `até "${kpis.maiorAbandonoEstagio}"` : "sem dados"}
        />
        <MetricCard
          label="Intervalo médio entre acessos"
          value={kpis.diasEntreAcessos !== null ? `${Math.round(kpis.diasEntreAcessos)} dias` : "—"}
          sub="janela fixa GA4 · não reage ao filtro"
        />
      </div>

      {/* 3. Onde abandonam? — funil dinâmico do período */}
      <div>
        <h3
          style={{ color: "var(--ds-color-text-secondary)" }}
          className="text-sm font-semibold mb-2"
        >
          Onde perdemos usuários? Download → primeiro uso → uso do app → uso recorrente
        </h3>
        <ChartLoading status={status} height={280}>
          <BarChart
            data={dadosFunil}
            xKey="estagio"
            yKey="usuarios"
            height={280}
            mostrarValorNaBarra
          />
        </ChartLoading>
        {insightFunil && (
          <p
            style={{ color: "var(--ds-color-text-secondary)" }}
            className="text-sm mt-2"
          >
            Maior queda: <strong>{insightFunil.quedaPct.toFixed(0)}%</strong> entre &quot;
            {rotuloEstagioFunil(insightFunil.estagioAtual)}&quot; e &quot;
            {rotuloEstagioFunil(insightFunil.estagioProximo)}&quot; —{" "}
            {Math.abs(insightFunil.usuariosPerdidos).toLocaleString("pt-BR")} pessoas a menos.
          </p>
        )}
      </div>

      {/* 4. Estão voltando? — recorrência em destaque + cadência 3 janelas */}
      {frequenciaAcesso && (
        <StoryCard
          snapshot
          anchor="Como o cidadão volta ao app"
          caption={interpretaStickiness(frequenciaAcesso)}
          comoLer="Cada acesso conta um dispositivo, não uma pessoa — quem usa o app em celular e tablet aparece duas vezes. As janelas de 1, 7 e 28 dias são fixas por definição (não reagem ao filtro de período). Os três grupos (diários, semanais, só no mês) não se sobrepõem — cada pessoa aparece em um só."
        >
          <SnapshotBadge updatedAt={snapshotFrequenciaEm} texto="Cadência apurada em" />
          <CadenciaAcessoSegmentos freq={frequenciaAcesso} />
        </StoryCard>
      )}

      {/* 5. Quantos usam uma vez só? — donut + KPI grande (dinâmico por período) */}
      {faixasDeAcesso.length > 0 && (
        <StoryCard
          anchor={`Como estão distribuídas as contas ativas ${rotuloPeriodo} por tempo desde o último acesso?`}
          caption={`Distribuição das ${faixasDeAcesso.reduce((a, f) => a + f.quantidade, 0).toLocaleString("pt-BR")} contas com atividade ${rotuloPeriodo}.`}
          comoLer='Cada conta aparece em uma faixa só, definida pela data do último acesso registrado no cadastro relativa ao fim do período selecionado. "Uma vez apenas" inclui quem criou a conta e não voltou depois do dia do cadastro — o banco guarda apenas o último acesso, não a contagem.'
        >
          <RecenciaContasCard faixas={faixasDeAcesso} />
        </StoryCard>
      )}

      {/* 6. Como estão entrando? — barras 100% Gov.BR × Próprio por faixa (dinâmico) */}
      {faixasDeAcessoPorTipo.length > 0 && (
        <StoryCard
          anchor={tituloAdocaoGovBrPorFaixa(faixasDeAcessoPorTipo)}
          caption={`Adoção do Gov.BR por tempo desde o último acesso, entre as contas ativas ${rotuloPeriodo}. ${fraseAdocaoGovBrPorFaixa(faixasDeAcessoPorTipo)}`}
          comoLer="Cada conta aparece em uma faixa só, definida pelo último acesso. A barra mostra a proporção de quem entra pelo Gov.BR dentro daquela faixa. Contas antigas sem essa marcação registrada foram contadas como Login Próprio, conforme confirmação técnica do time do app."
        >
          <FaixasDeAcessoPorTipoCard faixas={faixasDeAcessoPorTipo} />
        </StoryCard>
      )}

      {/* 7. Pontos de atenção */}
      {alertas.length > 0 && (
        <DashboardSection title="Pontos de atenção">
          <ul className="flex flex-col gap-2">
            {alertas.map((p, i) => (
              <li
                key={i}
                style={{ color: "var(--ds-color-text-primary)" }}
                className="text-sm flex gap-2 items-start"
              >
                <span
                  aria-hidden
                  style={{
                    background:
                      p.severidade === "alerta"
                        ? "var(--ds-color-danger)"
                        : p.severidade === "atencao"
                          ? "var(--ds-color-warning)"
                          : "var(--ds-color-primary-600)",
                  }}
                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                />
                <span>{p.texto}</span>
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}
    </div>
  );
}
