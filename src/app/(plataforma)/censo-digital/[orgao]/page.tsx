import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { getCensoOrgao, getCensoTodos } from "@/lib/data";
import { matrizImpactoEsforco, resumirOrgao } from "@/lib/censo";
import { ComoLerEscala } from "../ComoLerEscala";
import { EspectroMaturidade } from "../EspectroMaturidade";
import { CartasTable } from "../CartasTable";
import { KpiCenso } from "../KpiCenso";
import { MatrizImpactoEsforco } from "../MatrizImpactoEsforco";

export function generateStaticParams() {
  return getCensoTodos().map((o) => ({ orgao: o.orgaoSigla.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ orgao: string }> }): Promise<Metadata> {
  const { orgao } = await params;
  return { title: `Levantamento de Serviços Digitais — ${orgao.toUpperCase()} | SETDIG` };
}

export default async function CensoOrgaoPage({ params }: { params: Promise<{ orgao: string }> }) {
  const { orgao } = await params;
  const dados = getCensoOrgao(orgao);
  if (!dados) notFound();

  const r = resumirOrgao(dados.cartas);
  const matriz = matrizImpactoEsforco([dados]);
  const n = (v: number) => v.toLocaleString("pt-BR");
  const c = (v: number) => v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title={`Levantamento de Serviços Digitais — ${dados.orgaoSigla}`}>
        <ExportarRelatorioButton filtro={`Órgão: ${dados.orgaoSigla}`} />
      </ContentTopBar>
      <main className="flex-1 p-6 flex flex-col gap-6">
        <RelatorioCapa titulo={`Levantamento de Serviços Digitais — ${dados.orgaoSigla}`} filtro={`Órgão: ${dados.orgaoSigla}`} />
        <Link href="/censo-digital" className="text-sm font-medium hover:underline self-start" style={{ color: "var(--ds-color-primary-600)" }}>
          ← Todos os órgãos
        </Link>

        <StoryCard
          anchor={r.total === 0
            ? `${dados.orgaoSigla} ainda não informou nenhum serviço neste levantamento.`
            : `Dos ${n(r.total)} serviços que ${dados.orgaoSigla} informou, ${r.pctDigital.toLocaleString("pt-BR")}% já podem ser resolvidos 100% pela internet${r.oportunidades ? ` e ${n(r.oportunidades)} podem virar digitais` : ""}.`}
          comoLer={`Cada serviço tem um grau de 0 (só presencial) a 5 (100% online e automático); digital = níveis 4 e 5. O grau foi informado pelo próprio órgão, sem conferência externa. A tabela abaixo mostra onde cada serviço está, o que ainda é presencial e quantos pedidos recebe por mês.${r.nSemNivel ? ` ${n(r.nSemNivel)} sem grau informado (fora dos percentuais).` : ""}`}
        />

        <ComoLerEscala distribuicao={r.distribuicao} />

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCenso label="Serviços informados" value={r.total} />
          <KpiCenso label="Já resolvem online" value={`${r.pctDigital.toLocaleString("pt-BR")}%`} sub={`${n(r.nDigital)} serviços (níveis 4 e 5)`} tom="digital" />
          <KpiCenso label="Podem virar digitais" value={r.oportunidades} sub={`níveis 1 e 2 · outros ${n(r.nExigenciaLegal)} têm etapa presencial por lei`} tom="win" />
          <KpiCenso
            label="dos pedidos mensais caem em serviço 100% online"
            value={r.nComDemanda ? `${r.pctDemandaDigital.toLocaleString("pt-BR")}%` : "—"}
            sub={r.nComDemanda ? `${c(r.demandaDigital)} de ${c(r.demandaTotal)} pedidos/mês informados (${n(r.nComDemanda)} serviços)` : "nenhum serviço informou pedidos por mês"}
            tom="info"
          />
        </div>

        <DashboardSection title="Como os serviços deste órgão se distribuem entre o balcão e a internet">
          <EspectroMaturidade distribuicao={r.distribuicao} total={r.total} />
        </DashboardSection>

        <MatrizImpactoEsforco matriz={matriz} recorte="órgão" mostrarOrgao={false} />

        <DashboardSection title="Onde cada serviço está — e o que falta para ficar 100% online">
          <CartasTable cartas={dados.cartas} orgaoSigla={dados.orgaoSigla} mediana={matriz.mediana} />
        </DashboardSection>
      </main>
    </div>
  );
}
