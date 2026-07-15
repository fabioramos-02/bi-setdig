import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { labelCategoria } from "@/lib/servicos";
import type { InventarioResumo } from "@/lib/data";
import type { LiveServicos } from "./ServicosClient";

/** Resumo do domínio Serviços: quantas cartas ativas + quanto o cidadão
 * procurou cada área no período (demanda real, via visitas ao portal). */
export function VisaoGeralTab({
  resumo,
  live,
  status,
  rotuloPeriodo,
}: {
  resumo: InventarioResumo;
  live: LiveServicos | null;
  status: StatusIntervalo;
  rotuloPeriodo: string;
}) {
  const totalVisitas = live ? live.porCarta.reduce((acc, c) => acc + c.visitas, 0) : 0;
  const orgaoTop = live?.porOrgao[0] ?? null;
  const categoriaTop = live?.porCategoria[0] ?? null;
  const pct = (v: number) => (totalVisitas > 0 ? (v / totalVisitas) * 100 : 0);

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado
        status={status}
        mensagemFallback="Não foi possível buscar os acessos desse período agora — tenta um período menor ou tenta de novo em instantes."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Serviços ativos" value={resumo.ativos} sub={`de ${resumo.total.toLocaleString("pt-BR")} cadastrados`} />
        <MetricCard label={`Acessos a serviços ${rotuloPeriodo}`} value={live ? totalVisitas : "—"} />
        <MetricCard label="Órgão com mais acessos" value={orgaoTop?.rotulo ?? "—"} sub={orgaoTop ? `${pct(orgaoTop.visitas).toFixed(0)}% dos acessos` : undefined} />
        <MetricCard label="Área com mais acessos" value={categoriaTop ? labelCategoria(categoriaTop.rotulo) : "—"} sub={categoriaTop ? `${pct(categoriaTop.visitas).toFixed(0)}% dos acessos` : undefined} />
      </div>

      {orgaoTop && (
        <StoryCard
          anchor={`${orgaoTop.rotulo} é o órgão cujos serviços o cidadão mais acessou ${rotuloPeriodo}, com ${pct(orgaoTop.visitas).toFixed(0)}% dos acessos.`}
          caption={`${totalVisitas.toLocaleString("pt-BR")} acessos a páginas de serviço no período, somando todas as cartas.`}
          comoLer="Contamos quantas vezes cada página de serviço do portal foi aberta no período. Só entram cartas com pelo menos um acesso — quem não teve acesso não aparece no ranking. É acesso à página do serviço — não significa que o cidadão concluiu o atendimento."
        />
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <DashboardSection title="Órgãos com mais acessos">
          <ChartLoading status={status} height={260}>
            <RankingBarChart itens={(live?.porOrgao ?? []).slice(0, 10).map((o) => ({ label: o.rotulo, valor: o.visitas }))} />
          </ChartLoading>
        </DashboardSection>
        <DashboardSection title="Áreas com mais acessos">
          <ChartLoading status={status} height={260}>
            <RankingBarChart itens={(live?.porCategoria ?? []).slice(0, 10).map((c) => ({ label: labelCategoria(c.rotulo), valor: c.visitas }))} />
          </ChartLoading>
        </DashboardSection>
      </div>

      <DashboardSection title="Evolução dos 5 serviços com mais acessos">
        <ChartLoading status={status} height={280}>
          {live && live.evolucao.length > 0 ? (
            <MultiLineChart data={live.evolucao} xKey="rotulo" series={live.top5.map((k) => ({ key: k, label: k }))} />
          ) : (
            <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
              Sem dado suficiente pra montar a evolução neste período.
            </p>
          )}
        </ChartLoading>
      </DashboardSection>
    </div>
  );
}
