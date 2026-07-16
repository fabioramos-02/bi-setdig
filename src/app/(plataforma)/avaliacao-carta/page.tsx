import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import {
  getCartasErrosResumo,
  getCartasErrosPorOrgao,
  getCartasErrosEvolucaoMensal,
  getCartasErrosRelacao,
  getCartasPercepcaoResumo,
  getCartasPercepcaoPorOrgao,
  getCartasInventarioRelacao,
} from "@/lib/data";
import { QualidadeClient } from "./QualidadeClient";

export const metadata: Metadata = {
  title: "Avaliação sobre a carta de serviço | SETDIG",
};

export default function QualidadePage() {
  const resumo = getCartasErrosResumo();
  const porOrgao = getCartasErrosPorOrgao();
  const evolucaoMensal = getCartasErrosEvolucaoMensal();
  const relacao = getCartasErrosRelacao();
  const percepcao = getCartasPercepcaoResumo();
  const percepcaoPorOrgao = getCartasPercepcaoPorOrgao();
  const cartas = getCartasInventarioRelacao();

  const servicoToLinkInfo: Record<string, { slug: string; categoria: string }> = {};
  for (const c of cartas) {
    if (c.titulo && c.slug) {
      servicoToLinkInfo[c.titulo] = { slug: c.slug, categoria: c.categoria || "servicos" };
    }
  }

  if (!resumo) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Avaliação sobre a carta de serviço" />
        <main className="flex-1 p-6">
          <EmptyCard message="Ainda não há dados disponíveis aqui." />
        </main>
      </div>
    );
  }

  return (
    // useSearchParams (filtro de órgão) exige Suspense — ver QualidadeClient.
    <Suspense>
      <QualidadeClient resumo={resumo} porOrgao={porOrgao} evolucaoMensal={evolucaoMensal} relacao={relacao} percepcao={percepcao} percepcaoPorOrgao={percepcaoPorOrgao} servicoToLinkInfo={servicoToLinkInfo} />
    </Suspense>
  );
}
