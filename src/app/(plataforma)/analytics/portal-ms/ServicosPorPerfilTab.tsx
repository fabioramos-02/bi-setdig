import { EmptyCard } from "@/components/ds/EmptyCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ServiceCardGrid } from "@/components/dashboard/ServiceCardGrid";
import { BarChart } from "@/components/charts/BarChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import type { PerfilFiltroPeriodo } from "@/lib/data";

/**
 * Adoção do filtro de Perfil do Portal Único (estudo portado do bench-carta).
 * Lidera com o grid "Serviços em destaque" (visual do portal ms.gov.br), depois
 * a camada analítica: narrativa, funil, distribuição e ranking cruzado.
 */
export function ServicosPorPerfilTab({
  dados,
  tipoIntervalo,
}: {
  dados: PerfilFiltroPeriodo;
  tipoIntervalo: boolean;
}) {
  const { resumo, distribuicao, topServicos, servicosPorPerfil } = dados;

  if (resumo.homeVisitors === 0) {
    return <EmptyCard message="Sem dados de adoção do filtro de Perfil no período." />;
  }

  const porMil = resumo.usoRealPct * 10;
  const fracaoHome = resumo.proxyRatePct > 0 ? resumo.usoRealPct / resumo.proxyRatePct : 0;
  const acessosReais = Math.round(resumo.atribuiveis * fracaoHome);
  const perfilTop = distribuicao[0] ?? null;

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
                De cada <strong>1.000</strong> visitantes do portal, cerca de{" "}
                <strong>{porMil < 10 ? porMil.toFixed(1) : porMil.toFixed(0)}</strong> usam o filtro de Perfil para chegar
                a um serviço.
              </>
            }
            caption={`~1 a cada ${resumo.umACada.toLocaleString("pt-BR")} pessoas. Estimativa corrigida de ${acessosReais.toLocaleString("pt-BR")} acessos via filtro no período.`}
            comoLer="O 'acesso bruto' (proxy) é o limite superior — todas as visitas aos serviços exclusivos de cada perfil. O 'uso real' corrige esse número pela fração (~1,5%) que de fato chega pela home, onde o filtro de Perfil vive. Ainda é limite superior: a home inclui menu e busca, não só o card de Perfil."
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <MetricCard label="Visitantes da home" value={resumo.homeVisitors} />
          <MetricCard
            label="Uso real do filtro"
            value={`${resumo.usoRealPct.toFixed(3)}%`}
            sub={`limiar de referência: ${resumo.limiarPct}%`}
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
            { label: "Abriram serviços do perfil (bruto)", value: resumo.atribuiveis },
            { label: "Vieram de fato pelo filtro (corrigido)", value: acessosReais },
          ]}
        />
        <p className="mt-4 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Cada degrau é uma etapa da jornada: da home até quem realmente usou o filtro de Perfil. A queda entre o 2º e o
          3º degrau é a correção pela fração que vem da home.
        </p>
      </DashboardSection>

      {/* 4. Distribuição por perfil */}
      <DashboardSection title="Distribuição por perfil">
        {perfilTop && (
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            <strong>{perfilTop.perfilLabel}</strong> concentra {perfilTop.participacaoPct.toFixed(1)}% dos acessos
            atribuíveis ao filtro.
          </p>
        )}
        <BarChart
          data={distribuicao.map((d) => ({ perfil: d.perfilLabel, visitas: d.visitas }))}
          xKey="perfil"
          yKey="visitas"
          corPorIndice={(i) => (i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)")}
        />
        <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Só perfis com serviço exclusivo entram aqui — Empresa e Gestão Pública compartilham todos os destaques, então o
          acesso não é atribuível a um perfil único.
        </p>
      </DashboardSection>

      {/* 5. Top serviços (ranking cruzado) */}
      <DashboardSection title="Serviços mais acessados (ranking geral)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                <th className="pb-2">Serviço</th>
                <th className="pb-2">Perfil</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2 text-right">Visitas</th>
              </tr>
            </thead>
            <tbody>
              {topServicos.map((s) => (
                <tr key={s.path} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                  <td className="py-1.5 pr-3">{s.servico}</td>
                  <td className="py-1.5 pr-3" style={{ color: "var(--ds-color-text-secondary)" }}>
                    {s.perfilLabel}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: "var(--ds-color-background-muted)",
                        color: s.exclusivo ? "var(--ds-color-success)" : "var(--ds-color-text-muted)",
                      }}
                    >
                      {s.exclusivo ? "exclusivo" : "compartilhado"}
                    </span>
                  </td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                    {s.visitas.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Ranking por visitas somando todos os perfis (distinto do grid acima, que é por perfil).{" "}
          <strong>Exclusivo</strong>: serviço de um único perfil. <strong>Compartilhado</strong>: em 2+ perfis.
        </p>
      </DashboardSection>
    </div>
  );
}
