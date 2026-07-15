"use client";

import { useSearchParams } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { ErrosTab } from "./ErrosTab";
import { PercepcaoTab } from "./PercepcaoTab";
import type { ErroResumo, ErroOrgao, ErroEvolucaoMensal, ErroRelacao, PercepcaoResumo } from "@/lib/data";

/** Retrato da qualidade das cartas de serviço, em 2 abas: "Erros" (o serviço
 * tem problema técnico?) e "Qualidade" (o cidadão entende/gosta do serviço?)
 * — perguntas diferentes, por isso separadas. Sem filtro de período: é
 * estado + série histórica, não analytics de acesso ao vivo. O filtro de
 * órgão (menu lateral, ?orgao=SIGLA) afeta só a aba Erros (Análise por
 * Órgão + Detalhamento). */
export function QualidadeClient({
  resumo,
  porOrgao,
  evolucaoMensal,
  relacao,
  percepcao,
}: {
  resumo: ErroResumo;
  porOrgao: ErroOrgao[];
  evolucaoMensal: ErroEvolucaoMensal[];
  relacao: ErroRelacao[];
  percepcao: PercepcaoResumo | null;
}) {
  const orgaoFiltro = useSearchParams().get("orgao") ?? "";

  const abas: TabItem[] = [
    {
      id: "erros",
      label: "Erros",
      content: <ErrosTab resumo={resumo} porOrgao={porOrgao} evolucaoMensal={evolucaoMensal} relacao={relacao} orgaoFiltro={orgaoFiltro} />,
    },
    {
      id: "qualidade",
      label: "Qualidade",
      content: <PercepcaoTab percepcao={percepcao} />,
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Qualidade" />
      <main className="flex-1 p-6">
        <Tabs items={abas} />
      </main>
    </div>
  );
}
