import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import {
  getDatasetUpdatedAt,
  getTfsContrato,
  getTfsEtpUst,
  getTfsItens,
  getTfsSprints,
  getTfsStakeholders,
} from "@/lib/data";
import { ProjetoXviaClient } from "./ProjetoXviaClient";

export const metadata: Metadata = {
  title: "Projeto X-VIA | SETDIG",
  // Gestão interna do contrato (pendências, UST, valores): fora de buscadores,
  // do sitemap e do índice em markdown do proxy.
  robots: { index: false, follow: false },
};

export default function ProjetoXviaPage() {
  const itens = getTfsItens();
  const atualizadoEm = getDatasetUpdatedAt("tfs", "itens");

  if (itens.length === 0 || !atualizadoEm) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Projeto X-VIA" />
        <main className="flex-1 p-6">
          <EmptyCard message="Ainda não há dados do TFS disponíveis aqui." />
        </main>
      </div>
    );
  }

  return (
    // Filtros ficam na URL (useSearchParams) — exige Suspense.
    <Suspense>
      <ProjetoXviaClient
        itens={itens}
        sprints={getTfsSprints()}
        contrato={getTfsContrato()}
        etp={getTfsEtpUst()}
        stakeholders={getTfsStakeholders()}
        // "Hoje" é o dia da extração: prazos e dias parados batem com o dado.
        hoje={atualizadoEm.slice(0, 10)}
      />
    </Suspense>
  );
}
