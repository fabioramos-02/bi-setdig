import { EmptyCard } from "@/components/ds/EmptyCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ServiceCardGrid } from "@/components/dashboard/ServiceCardGrid";
import { BarChart } from "@/components/charts/BarChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { PORTAL_BASE_URL } from "@/components/dashboard/ServiceCardGrid";
import type { PerfilFiltroPeriodo, ServicoAcessado } from "@/lib/data";

/**
 * Adoção do filtro de Perfil do Portal Único (estudo portado do bench-carta).
 * Lidera com o grid "Serviços em destaque" (visual do portal ms.gov.br), depois
 * a camada analítica: narrativa, funil, distribuição e ranking cruzado.
 */
export function ServicosPorPerfilTab({
  dados,
  servicosMaisAcessados,
  tipoIntervalo,
}: {
  dados: PerfilFiltroPeriodo;
  servicosMaisAcessados: ServicoAcessado[];
  tipoIntervalo: boolean;
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
      {tipoIntervalo && (
        <p
          className="mb-4 text-sm rounded"
          style={{
            background: "var(--ds-color-background-muted)",
            color: "var(--ds-color-text-secondary)",
            padding: "var(--ds-spacing-12)",
          }}
        >
          O estudo não tem recorte por intervalo arbitrário (ADR-007) — exibindo o snapshot do <strong>mês</strong>.
        </p>
      )}

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
            caption={`No período, os serviços em destaque somaram ${resumo.atribuiveis.toLocaleString("pt-BR")} visitas — ${resumo.proxyRatePct.toFixed(2)}% dos visitantes da home. Nem tudo isso vem do filtro: menu e busca levam aos mesmos serviços.`}
            comoLer="O clique na aba de perfil (Cidadão, Servidor Público, Empresa, Gestão Pública) não fica registrado separadamente no Matomo — só dá pra medir direto quantas visitas os serviços em destaque receberam. A estimativa de uso do filtro (1 em cada N) vem de uma amostra pequena de 2025 e é um teto: o uso real tende a ser ainda menor."
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard label="Visitantes da home" value={resumo.homeVisitors} />
          <MetricCard
            label="Visitas aos serviços em destaque"
            value={resumo.atribuiveis}
            sub={`meta mínima considerada relevante: ${resumo.limiarPct}%`}
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
        <FunnelChart
          steps={[
            { label: "Visitantes da home", value: resumo.homeVisitors },
            { label: "Visitas aos serviços em destaque", value: resumo.atribuiveis },
            { label: "Estimativa de uso do filtro", value: estimativaUsoFiltro },
          ]}
        />
        <p className="mt-4 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Cada barra é uma etapa: quem visita a home, quem chega aos serviços em destaque, e quantos desses acessos vêm
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
        <BarChart
          data={distribuicao.map((d) => ({ perfil: d.perfilLabel, visitas: d.visitas }))}
          xKey="perfil"
          yKey="visitas"
          corPorIndice={(i) => (i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)")}
        />
        <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Só perfis com serviço exclusivo entram aqui — Empresa e Gestão Pública compartilham todos os destaques, então
          não dá pra saber quanto do acesso é de cada um.
        </p>
      </DashboardSection>

      {/* 5. Serviços mais acessados (reais do portal, não só os do filtro de Perfil) */}
      <DashboardSection title="Serviços mais acessados">
        {servicoTop ? (
          <>
            <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
              <strong>{servicoTop.servico}</strong> lidera com {servicoTop.visitas.toLocaleString("pt-BR")} visitas —{" "}
              {(servicoTop.visitas / (servicosMaisAcessados[1]?.visitas || 1)).toFixed(1)}x o segundo colocado. Barra
              mais longa e mais escura = mais visitas. Clique num serviço para abrir no portal.
            </p>
            <RankingBarChart
              itens={servicosMaisAcessados.map((s) => ({
                label: s.servico,
                valor: s.visitas,
                href: `${PORTAL_BASE_URL}${s.path}`,
              }))}
            />
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
