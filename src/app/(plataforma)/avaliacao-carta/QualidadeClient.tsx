"use client";

import { useSearchParams } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { ErrosTab } from "./ErrosTab";
import { PercepcaoTab } from "./PercepcaoTab";
import type { ErroOrgao, ErroResumo, ErroEvolucaoMensal, ErroRelacao, PercepcaoResumo, PercepcaoOrgao } from "@/lib/data";

/** Retrato da avaliação das cartas de serviço, em 2 abas: "Erros" (o serviço
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
  percepcaoPorOrgao,
  servicoToLinkInfo,
}: {
  resumo: ErroResumo;
  porOrgao: ErroOrgao[];
  evolucaoMensal: ErroEvolucaoMensal[];
  relacao: ErroRelacao[];
  percepcao: PercepcaoResumo | null;
  percepcaoPorOrgao: PercepcaoOrgao[];
  servicoToLinkInfo: Record<string, { slug: string; categoria: string }>;
}) {
  const orgaoFiltro = useSearchParams().get("orgao") ?? "";

  const percepcaoAtual = orgaoFiltro
    ? percepcaoPorOrgao.find((p) => p.orgaoSigla === orgaoFiltro) || null
    : percepcao;

  const abas: TabItem[] = [
    {
      id: "erros",
      label: "Erros reportados",
      content: <ErrosTab resumo={resumo} porOrgao={porOrgao} evolucaoMensal={evolucaoMensal} relacao={relacao} orgaoFiltro={orgaoFiltro} servicoToLinkInfo={servicoToLinkInfo} />,
    },
    {
      id: "qualidade",
      label: "Satisfação",
      content: <PercepcaoTab percepcao={percepcaoAtual} percepcaoPorOrgao={percepcaoPorOrgao} orgaoFiltro={orgaoFiltro} />,
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Avaliação sobre a carta de serviço" />
      <main className="flex-1 p-6">
        <Tabs items={abas} />
      </main>
    </div>
  );
}
