import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { getCensoOrgao } from "@/lib/data";
import { resumirOrgao, SIGLAS_CENSO } from "@/lib/censo";
import { ComoLerEscala } from "../ComoLerEscala";
import { EspectroMaturidade } from "../EspectroMaturidade";
import { CartasTable } from "../CartasTable";

export function generateStaticParams() {
  return SIGLAS_CENSO.map((orgao) => ({ orgao }));
}

export async function generateMetadata({ params }: { params: Promise<{ orgao: string }> }): Promise<Metadata> {
  const { orgao } = await params;
  return { title: `Censo Digital — ${orgao.toUpperCase()} | SETDIG` };
}

export default async function CensoOrgaoPage({ params }: { params: Promise<{ orgao: string }> }) {
  const { orgao } = await params;
  const dados = getCensoOrgao(orgao);
  if (!dados) notFound();

  const r = resumirOrgao(dados.cartas);

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title={`Censo Digital — ${dados.orgaoSigla}`} />
      <main className="flex-1 p-6 flex flex-col gap-6">
        <Link href="/censo-digital" className="text-sm font-medium hover:underline self-start" style={{ color: "var(--ds-color-primary-600)" }}>
          ← Todos os órgãos
        </Link>

        <StoryCard
          anchor={`Das ${r.total.toLocaleString("pt-BR")} cartas de serviço do ${dados.orgaoSigla}, ${r.pctDigital.toLocaleString("pt-BR")}% já podem ser resolvidas 100% pela internet.`}
          caption={`${r.aUmPasso.toLocaleString("pt-BR")} serviços estão a um passo disso — começam online, mas ainda terminam no balcão.`}
          comoLer="Cada carta é medida numa régua de 0 (só no balcão) a 4 (100% pela internet). A tabela abaixo mostra onde cada serviço está e o que ainda trava. A classificação usa inteligência artificial com revisão humana."
        />

        <ComoLerEscala />

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Serviços avaliados" value={r.total} />
          <MetricCard label="Já resolvem online" value={`${r.pctDigital.toLocaleString("pt-BR")}%`} sub={`${r.nDigital.toLocaleString("pt-BR")} serviços`} />
          <MetricCard label="A um passo" value={r.aUmPasso} sub="começam online, terminam no balcão" />
          <MetricCard label="Usam algum sistema" value={r.nFalaSistema} />
        </div>

        <DashboardSection title="Como os serviços deste órgão se distribuem entre o balcão e a internet">
          <EspectroMaturidade distribuicao={r.distribuicao} total={r.total} />
        </DashboardSection>

        <DashboardSection title="Onde cada serviço está — e o que falta para ficar 100% online">
          <CartasTable cartas={dados.cartas} />
        </DashboardSection>
      </main>
    </div>
  );
}
