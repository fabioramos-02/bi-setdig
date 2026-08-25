import { EmptyCard } from "@/components/ds/EmptyCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { ServiceCardGrid } from "@/components/dashboard/ServiceCardGrid";
import { BarChart } from "@/components/charts/BarChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { PORTAL_BASE_URL } from "@/components/dashboard/ServiceCardGrid";
import type { PerfilFiltroPeriodo, ServicoAcessado, AcessoCartaCompleto } from "@/lib/data";

/**
 * Adoção do filtro de Perfil do Portal Único (estudo portado do bench-carta).
 * Lidera com o grid "Serviços em destaque" (visual do portal ms.gov.br), depois
 * a camada analítica: narrativa, funil, distribuição e ranking cruzado.
 */
export function ServicosPorPerfilTab({
  dados,
  servicosMaisAcessados,
  acessosCartas,
  semDadoLive,
  status,
}: {
  dados: PerfilFiltroPeriodo;
  servicosMaisAcessados: ServicoAcessado[];
  acessosCartas: AcessoCartaCompleto[];
  // ponytail: acessosCartas ainda é snapshot-only (não plumbado no
  // /api/analytics/portal-ms). Quando o usuário escolhe intervalo/período
  // passado, escondemos a seção e mostramos aviso — melhor omitir do que
  // exibir número errado (AGENTS.md proíbe dado estático em domínio com
  // filtro de período). TODO: adicionar acessosCartas no route pra live.
  semDadoLive: boolean;
  status: StatusIntervalo;
}) {
  const { resumo, distribuicao, servicosPorPerfil } = dados;

  if (resumo.homeVisitors === 0) {
    return <EmptyCard message="Sem dados de adoção do filtro de Perfil no período." />;
  }

  const perfilTop = distribuicao[0] ?? null;
  const servicoTop = servicosMaisAcessados[0] ?? null;
  // fração de correção (~1,5%, amostra pequena de 2025 — ver transform/perfil.py)
  // derivada de volta dos percentuais já calculados, sem repetir a constante aqui.
  const fracaoEstimativa = resumo.proxyRatePct > 0 ? resumo.usoRealPct / resumo.proxyRatePct : 0;
  const estimativaUsoFiltro = Math.round(resumo.atribuiveis * fracaoEstimativa);

  return (
    <div>
      <AvisoSnapshotAproximado status={status} />

      {/* 1. Narrativa + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <StoryCard
            anchor={
              <>
                Cerca de 1 em cada <strong>{resumo.umACada.toLocaleString("pt-BR")}</strong> visitantes do portal chega a
                um serviço pelo filtro de Perfil.
              </>
            }
            caption={`No período, os serviços em destaque somaram ${resumo.atribuiveis.toLocaleString("pt-BR")} visitas — ${resumo.proxyRatePct.toFixed(2)}% dos visitantes da página inicial. Nem tudo isso vem do filtro: menu e busca levam aos mesmos serviços.`}
            comoLer="O clique na aba de perfil (Cidadão, Servidor Público, Empresa, Gestão Pública) não é registrado separadamente pela ferramenta de estatísticas do portal — só dá pra medir direto quantas visitas os serviços em destaque receberam. A estimativa de uso do filtro (1 em cada N) vem de um estudo pequeno feito em 2025 e é um número máximo possível: o uso real tende a ser ainda menor."
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard label="Visitantes da página inicial" value={resumo.homeVisitors} />
          <MetricCard
            label="Visitas aos serviços em destaque"
            value={resumo.atribuiveis}
            sub={`mínimo considerado relevante: ${resumo.limiarPct}%`}
          />
        </div>
      </div>

      {/* 2. Grid de serviços (estilo portal) */}
      <DashboardSection title="Serviços em destaque">
        <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Serviços recomendados por público alvo — mesma organização do portal www.ms.gov.br.
        </p>
        <ServiceCardGrid servicosPorPerfil={servicosPorPerfil} />
      </DashboardSection>

      {/* 3. Funil */}
      <DashboardSection title="Como o visitante chega ao serviço pelo filtro">
        <ChartLoading status={status} height={120}>
          <FunnelChart
            steps={[
              { label: "Visitantes da página inicial", value: resumo.homeVisitors },
              { label: "Visitas aos serviços em destaque", value: resumo.atribuiveis },
              { label: "Estimativa de uso do filtro", value: estimativaUsoFiltro },
            ]}
          />
        </ChartLoading>
        <p className="mt-4 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Cada barra é uma etapa: quem visita a página inicial, quem chega aos serviços em destaque, e quantos desses acessos vêm
          de fato do filtro de Perfil — a última barra é estimativa, não medida direta.
        </p>
      </DashboardSection>

      {/* 4. Distribuição por perfil */}
      <DashboardSection title="Distribuição por perfil">
        {perfilTop && (
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            <strong>{perfilTop.perfilLabel}</strong> concentra {perfilTop.participacaoPct.toFixed(1)}% dos acessos aos
            serviços em destaque.
          </p>
        )}
        <ChartLoading status={status} height={260}>
          <BarChart
            data={distribuicao.map((d) => ({ perfil: d.perfilLabel, visitas: d.visitas }))}
            xKey="perfil"
            yKey="visitas"
            corPorIndice={(i) => (i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)")}
          />
        </ChartLoading>
        <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Só perfis com serviço exclusivo entram aqui — Empresa e Gestão Pública compartilham todos os destaques, então
          não dá pra saber quanto do acesso é de cada um.
        </p>
      </DashboardSection>

      {/* 5. Cartas de serviço: chegada × ida ao serviço externo */}
      {acessosCartas.length > 0 && (
        <DashboardSection title="Quantas pessoas chegam na carta e seguem para o serviço?">
          {semDadoLive ? (
            <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
              Este número só está disponível para o período em vigor (dia, semana, mês, ano correntes). Para o intervalo escolhido, ainda não é possível calcular ao vivo.
            </p>
          ) : (
            (() => {
              const topPorConversao = acessosCartas
                .filter((c) => c.taxaConversaoPct !== null && c.pageviews >= 50)
                .sort((a, b) => (b.taxaConversaoPct ?? 0) - (a.taxaConversaoPct ?? 0));
              const melhor = topPorConversao[0];
              const pior = topPorConversao[topPorConversao.length - 1];
              const totalPageviews = acessosCartas.reduce((s, c) => s + c.pageviews, 0);
              const totalCliques = acessosCartas.reduce((s, c) => s + c.cliques, 0);
              const taxaGeral = totalPageviews > 0 ? (totalCliques / totalPageviews) * 100 : null;

              return (
                <>
                  <StoryCard
                    anchor={
                      taxaGeral !== null ? (
                        <>
                          A cada <strong>100 cidadãos</strong> que abrem uma carta de serviço, cerca de{" "}
                          <strong>{taxaGeral.toFixed(0)}</strong> clicam em &quot;Acessar serviço&quot; e vão para o site do
                          órgão responsável.
                        </>
                      ) : (
                        <>Ainda sem visitas suficientes para medir quantos cidadãos seguem para o serviço.</>
                      )
                    }
                    caption={
                      melhor && pior && melhor !== pior
                        ? `A carta com melhor conversão é "${melhor.titulo}" (${melhor.taxaConversaoPct?.toFixed(1)}%); a mais baixa é "${pior.titulo}" (${pior.taxaConversaoPct?.toFixed(1)}%). Considerado apenas cartas com pelo menos 50 visitas no período.`
                        : undefined
                    }
                    comoLer="Para cada carta, comparamos quantas pessoas abriram a página (chegada) com quantas clicaram no botão para ir ao serviço (ida). Uma taxa alta significa que a carta convenceu o cidadão a seguir; uma taxa baixa pode indicar que a carta está confusa, que o link não funciona ou que a pessoa precisou de outro caminho."
                  />

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: "var(--ds-color-border)" }}>
                          <th className="text-left py-2 pr-4" style={{ color: "var(--ds-color-text-secondary)" }}>Carta</th>
                          <th className="text-left py-2 pr-4" style={{ color: "var(--ds-color-text-secondary)" }}>Órgão</th>
                          <th className="text-right py-2 pr-4" style={{ color: "var(--ds-color-text-secondary)" }}>Chegaram</th>
                          <th className="text-right py-2 pr-4" style={{ color: "var(--ds-color-text-secondary)" }}>Seguiram</th>
                          <th className="text-right py-2" style={{ color: "var(--ds-color-text-secondary)" }}>Conversão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acessosCartas.slice(0, 15).map((c) => (
                          <tr key={c.slug} className="border-b" style={{ borderColor: "var(--ds-color-border)" }}>
                            <td className="py-2 pr-4">{c.titulo}</td>
                            <td className="py-2 pr-4" style={{ color: "var(--ds-color-text-muted)" }}>{c.orgaoSigla ?? "—"}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{c.pageviews.toLocaleString("pt-BR")}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{c.cliques.toLocaleString("pt-BR")}</td>
                            <td className="py-2 text-right tabular-nums">
                              {c.taxaConversaoPct !== null ? `${c.taxaConversaoPct.toFixed(1)}%` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {acessosCartas.length > 15 && (
                      <p className="mt-2 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                        Mostrando 15 cartas mais acessadas de {acessosCartas.length} no período.
                      </p>
                    )}
                  </div>
                </>
              );
            })()
          )}
        </DashboardSection>
      )}

      {/* 6. Serviços mais acessados (reais do portal, não só os do filtro de Perfil) */}
      <DashboardSection title="Serviços mais acessados">
        {servicoTop ? (
          <>
            <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
              <strong>{servicoTop.servico}</strong> lidera com {servicoTop.visitas.toLocaleString("pt-BR")} visitas —{" "}
              {(servicoTop.visitas / (servicosMaisAcessados[1]?.visitas || 1)).toFixed(1)}x o segundo colocado. Barra
              mais longa e mais escura = mais visitas. Clique num serviço para abrir no portal.
            </p>
            <ChartLoading status={status} height={260}>
              <RankingBarChart
                itens={servicosMaisAcessados.map((s) => ({
                  label: s.servico,
                  valor: s.visitas,
                  href: `${PORTAL_BASE_URL}${s.path}`,
                }))}
              />
            </ChartLoading>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
            Sem serviços acessados no período.
          </p>
        )}
      </DashboardSection>
    </div>
  );
}
