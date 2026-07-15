import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { labelCategoria, resumoPrazo, resumoPublico } from "@/lib/servicos";
import type { InventarioResumo, CartaRelacao } from "@/lib/data";
import type { LiveServicos } from "./ServicosClient";

/** Resumo do domínio Serviços: quantas cartas ativas + quanto o cidadão
 * procurou cada área no período (demanda real, via visitas ao portal). */
export function VisaoGeralTab({
  resumo,
  cartas,
  live,
  status,
  rotuloPeriodo,
}: {
  resumo: InventarioResumo;
  cartas: CartaRelacao[];
  live: LiveServicos | null;
  status: StatusIntervalo;
  rotuloPeriodo: string;
}) {
  const totalVisitas = live ? live.porCarta.reduce((acc, c) => acc + c.visitas, 0) : 0;
  const orgaoTop = live?.porOrgao[0] ?? null;
  const categoriaTop = live?.porCategoria[0] ?? null;
  const pct = (v: number) => (totalVisitas > 0 ? (v / totalVisitas) * 100 : 0);

  const prazos = resumoPrazo(cartas);
  const totalPrazos = prazos.reduce((acc, f) => acc + f.total, 0);
  const imediatoPct = totalPrazos > 0 ? ((prazos.find((f) => f.label === "Acesso imediato")?.total ?? 0) / totalPrazos) * 100 : 0;

  const publicos = resumoPublico(cartas);

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

      <DashboardSection title="Prazo de atendimento">
        <RankingBarChart itens={prazos.map((f) => ({ label: f.label, valor: f.total }))} cor="var(--ds-color-secondary-600)" />
        {imediatoPct > 0 && (
          <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            {imediatoPct.toFixed(0)}% dos serviços ativos têm acesso imediato — sem prazo de espera.
          </p>
        )}
      </DashboardSection>

      {publicos.length > 0 && (
        <DashboardSection title="Serviços por público-alvo">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {publicos.map((p) => (
              <div
                key={p.label}
                className="flex flex-col items-center text-center gap-2 p-4"
                style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)" }}
              >
                <span
                  className="material-icons flex items-center justify-center"
                  aria-hidden
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--ds-radius-md)",
                    background: "color-mix(in srgb, var(--ds-color-primary-600) 12%, transparent)",
                    color: "var(--ds-color-primary-600)",
                    fontSize: 24,
                  }}
                >
                  {p.icone}
                </span>
                <div style={{ color: "var(--ds-color-text-primary)" }} className="text-lg font-semibold">
                  {p.total.toLocaleString("pt-BR")}
                </div>
                <div style={{ color: "var(--ds-color-text-secondary)" }} className="text-xs">
                  {p.label}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            Um serviço pode atender mais de um público — a soma pode passar do total de serviços ativos.
          </p>
        </DashboardSection>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <DashboardSection title="Órgãos com mais acessos">
          <ChartLoading status={status} height={260}>
            <RankingBarChart itens={(live?.porOrgao ?? []).slice(0, 10).map((o) => ({ label: o.rotulo, valor: o.visitas }))} />
          </ChartLoading>
        </DashboardSection>
        <DashboardSection title="Categorias com mais acessos">
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
