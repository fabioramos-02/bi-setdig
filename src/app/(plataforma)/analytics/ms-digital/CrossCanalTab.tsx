import { BarChart } from "@/components/charts/BarChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import type { ComparacaoCanais } from "@/lib/cross-canal";

/** Contexto cross-BI: o mesmo cidadão em dois canais — app (MS Digital / GA4) e
 * portal web (www.ms.gov.br / Matomo). Não é soma: a mesma pessoa pode usar os
 * dois, e as janelas de cada fonte não batem exatamente (ver comoLer). */
export function CrossCanalTab({ comparacao }: { comparacao: ComparacaoCanais }) {
  const { alcanceApp, alcancePortal, appServicos, portalServicos, appPlataforma, portalDispositivos } = comparacao;
  const maior = alcanceApp >= alcancePortal ? "app" : "portal";

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`No período, ${maior === "app" ? "o app" : "o portal na internet"} foi o canal que mais gente usou para chegar aos serviços do Estado.`}
        caption={`App: ${alcanceApp.toLocaleString("pt-BR")} pessoas. Portal na internet: ${alcancePortal.toLocaleString("pt-BR")} pessoas.`}
        comoLer="São dois caminhos para o mesmo serviço. Não dá para somar os dois: a mesma pessoa pode usar o app e o site. Os números também vêm de ferramentas diferentes (GA4 no app, Matomo no site), então servem para comparar tamanho, não para uma conta exata."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <MetricCard label="Pessoas no app (MS Digital)" value={alcanceApp} sub="usuários ativos no período" />
        <MetricCard label="Pessoas no portal (site)" value={alcancePortal} sub="visitantes únicos no período" />
      </div>

      <DashboardSection title="Serviços mais acessados em cada canal">
        <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          O que as pessoas mais procuram muda de um canal para o outro. Os nomes não são iguais nos dois lados — no app são
          telas, no site são páginas — então compare as listas, não linha a linha.
        </p>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              No app
            </h3>
            <BarChart
              data={appServicos}
              xKey="servico"
              yKey="valor"
              height={260}
              corPorIndice={(i) => (i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)")}
            />
          </div>
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              No portal (site)
            </h3>
            <BarChart
              data={portalServicos}
              xKey="servico"
              yKey="valor"
              height={260}
              corPorIndice={(i) => (i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)")}
            />
          </div>
        </div>
      </DashboardSection>

      <DashboardSection title="Como o cidadão acessa cada canal">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              App — por aparelho
            </h3>
            <BarChart data={appPlataforma} xKey="operatingSystem" yKey="activeUsers" height={240} />
          </div>
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              Portal — por tipo de dispositivo
            </h3>
            <BarChart data={portalDispositivos} xKey="dispositivo" yKey="visitas" height={240} />
          </div>
        </div>
        <p className="mt-4 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          No app, o corte é por sistema do celular (Android, iPhone). No site, é por tipo de aparelho (celular,
          computador). São visões parecidas, mas de fontes diferentes.
        </p>
      </DashboardSection>
    </div>
  );
}
