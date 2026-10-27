import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { getCensoTodos, getEtapasN4 } from "@/lib/data";
import { panoramaN4 } from "@/lib/censo-n4";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { Nivel4Tab } from "./Nivel4Tab";

export const metadata: Metadata = {
  title: "Levantamento de Serviços Digitais | SETDIG",
};

export default function CensoDigitalPage() {
  const orgaos = getCensoTodos();

  if (orgaos.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Levantamento de Serviços Digitais" />
        <main className="flex-1 p-6">
          <EmptyCard message="Ainda não há órgãos avaliados aqui." />
        </main>
      </div>
    );
  }

  const etapas = getEtapasN4();
  // Sem estado de cliente além da aba ativa: as abas já chegam renderizadas
  // no servidor e o Tabs (client) só alterna qual aparece.
  const abas: TabItem[] = [
    { id: "visao-geral", label: "1. Visão Geral", content: <VisaoGeralTab orgaos={orgaos} /> },
    { id: "nivel-4", label: "2. Nível 4 na prática", content: <Nivel4Tab p={panoramaN4(orgaos, etapas)} etapasLidas={etapas.length > 0} /> },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Levantamento de Serviços Digitais">
        <ExportarRelatorioButton filtro="Retrato atual dos serviços digitais" />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <RelatorioCapa titulo="Levantamento de Serviços Digitais" filtro="Retrato atual dos serviços digitais" />
        <Tabs items={abas} />
      </main>
    </div>
  );
}
