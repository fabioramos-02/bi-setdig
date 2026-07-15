import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import type { InventarioOrgao, CartaRelacao } from "@/lib/data";
import type { LiveServicos } from "./ServicosClient";

/** Demanda (visitas no período) × oferta (nº de cartas) por órgão e por setor.
 * Setor só aparece depois de rodar o pipeline com a SQL estendida (VPN) — sem
 * ele, as seções de setor mostram um aviso em vez de dado falso. */
export function OrgaosSetoresTab({
  live,
  orgaos,
  cartas,
  status,
  rotuloPeriodo,
}: {
  live: LiveServicos | null;
  orgaos: InventarioOrgao[];
  cartas: CartaRelacao[];
  status: StatusIntervalo;
  rotuloPeriodo: string;
}) {
  // Oferta: quantas cartas ativas cada órgão/setor possui (estático).
  const cartasPorOrgao = orgaos
    .map((o) => ({ label: o.orgaoSigla, valor: o.ativos }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const setorCount = new Map<string, number>();
  for (const c of cartas) if (c.setor) setorCount.set(c.setor, (setorCount.get(c.setor) ?? 0) + 1);
  const cartasPorSetor = [...setorCount.entries()].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  const temSetor = setorCount.size > 0;

  const avisoSetor = (
    <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
      A informação de setor ainda não está disponível — depende de uma nova extração do inventário.
    </p>
  );

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <DashboardSection title={`Órgãos mais procurados ${rotuloPeriodo}`}>
          <ChartLoading status={status} height={260}>
            <RankingBarChart itens={(live?.porOrgao ?? []).slice(0, 10).map((o) => ({ label: o.rotulo, valor: o.visitas }))} />
          </ChartLoading>
        </DashboardSection>
        <DashboardSection title="Órgãos com mais serviços cadastrados">
          <RankingBarChart itens={cartasPorOrgao} cor="var(--ds-color-text-muted)" />
        </DashboardSection>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <DashboardSection title={`Setores mais procurados ${rotuloPeriodo}`}>
          {live && live.porSetor.length > 0 ? (
            <ChartLoading status={status} height={260}>
              <RankingBarChart itens={live.porSetor.slice(0, 10).map((s) => ({ label: s.rotulo, valor: s.visitas }))} />
            </ChartLoading>
          ) : (
            avisoSetor
          )}
        </DashboardSection>
        <DashboardSection title="Setores com mais serviços cadastrados">
          {temSetor ? <RankingBarChart itens={cartasPorSetor} cor="var(--ds-color-text-muted)" /> : avisoSetor}
        </DashboardSection>
      </div>
    </div>
  );
}
