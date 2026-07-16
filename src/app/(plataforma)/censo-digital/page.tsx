import type { Metadata } from "next";
import Link from "next/link";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { getCensoTodos } from "@/lib/data";
import { agregarGoverno } from "@/lib/censo";
import { ComoLerEscala } from "./ComoLerEscala";
import { KpiCenso } from "./KpiCenso";
import { DonutProgresso } from "./DonutProgresso";
import { PizzaDistribuicao } from "./PizzaDistribuicao";

export const metadata: Metadata = {
  title: "Censo Digital | SETDIG",
};

export default function CensoDigitalPage() {
  const orgaos = getCensoTodos();

  if (orgaos.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Censo Digital" />
        <main className="flex-1 p-6">
          <EmptyCard message="Ainda não há órgãos avaliados aqui." />
        </main>
      </div>
    );
  }

  const p = agregarGoverno(orgaos);
  const lider = p.orgaos[0];
  const lanterna = p.orgaos[p.orgaos.length - 1];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Censo Digital">
        <ExportarRelatorioButton filtro="Retrato atual da maturidade" />
      </ContentTopBar>
      <main className="flex-1 p-6 flex flex-col gap-6">
        <RelatorioCapa titulo="Censo Digital — Maturidade dos serviços" filtro="Retrato atual da maturidade" />
        <StoryCard
          anchor={`O Governo de MS tem ${p.total.toLocaleString("pt-BR")} serviços mapeados em ${p.nOrgaos} ${p.nOrgaos === 1 ? "órgão" : "órgãos"}. Hoje, ${p.pctDigital.toLocaleString("pt-BR")}% já podem ser resolvidos sem sair de casa.`}
          caption={`${p.aUmPasso.toLocaleString("pt-BR")} serviços estão a um passo disso — começam online, mas ainda terminam no balcão.`}
          comoLer="Cada serviço é medido numa régua de 0 (só no balcão) a 4 (100% pela internet). Chamamos de digital quem chega aos níveis 3 e 4. A classificação usa inteligência artificial com revisão humana — pode conter aproximações."
        />

        <ComoLerEscala distribuicao={p.distribuicao} />

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <KpiCenso label="Órgãos avaliados" value={p.nOrgaos} />
          <KpiCenso label="Serviços avaliados" value={p.total} />
          <KpiCenso label="Já resolvem online" value={`${p.pctDigital.toLocaleString("pt-BR")}%`} sub={`${p.nDigital.toLocaleString("pt-BR")} serviços`} tom="digital" />
          <KpiCenso label="100% pela internet" value={p.n4} tom="digital" />
          <KpiCenso label="A um passo" value={p.aUmPasso} sub="começam online, terminam no balcão" tom="win" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <DashboardSection title="Como os serviços se distribuem entre o balcão e a internet">
            <PizzaDistribuicao distribuicao={p.distribuicao} total={p.total} />
          </DashboardSection>
          <DashboardSection title="Quanto já dá para resolver pela internet">
            <DonutProgresso pct={p.pctDigital} legenda="dos serviços já resolvem pela internet" />
          </DashboardSection>
        </div>

        <DashboardSection title="Quais órgãos estão mais avançados na digitalização?">
          <RankingBarChart
            itens={p.orgaos.map((o) => ({ label: o.sigla, valor: o.pctDigital, sublabel: `${o.total} serviços` }))}
            formatarValor={(v) => `${v.toLocaleString("pt-BR")}%`}
          />
          {lider && lanterna && lider.sigla !== lanterna.sigla && (
            <p className="mt-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
              <strong>{lider.sigla}</strong> lidera com {lider.pctDigital.toLocaleString("pt-BR")}% dos serviços já online.{" "}
              <strong>{lanterna.sigla}</strong> concentra a maior oportunidade: {lanterna.aUmPasso.toLocaleString("pt-BR")} serviços a um passo de ficarem digitais.
            </p>
          )}
        </DashboardSection>

        <DashboardSection title="Abra o retrato de cada órgão">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {p.orgaos.map((o) => (
              <Link
                key={o.sigla}
                href={`/censo-digital/${o.sigla.toLowerCase()}`}
                className="block rounded-md p-4 transition-colors hover:bg-[var(--ds-color-background-muted)]"
                style={{ border: "1px solid var(--ds-color-border)" }}
              >
                <div className="font-semibold text-lg" style={{ color: "var(--ds-color-primary-600)" }}>{o.sigla}</div>
                <div className="text-xs mb-3 line-clamp-2" style={{ color: "var(--ds-color-text-muted)" }}>{o.nome}</div>
                <div className="flex gap-4 text-sm">
                  <Stat valor={o.total.toLocaleString("pt-BR")} rotulo="serviços" />
                  <Stat valor={`${o.pctDigital.toLocaleString("pt-BR")}%`} rotulo="online" />
                  <Stat valor={o.aUmPasso.toLocaleString("pt-BR")} rotulo="a um passo" />
                </div>
              </Link>
            ))}
          </div>
        </DashboardSection>
      </main>
    </div>
  );
}

function Stat({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <div className="font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>{valor}</div>
      <div className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>{rotulo}</div>
    </div>
  );
}
