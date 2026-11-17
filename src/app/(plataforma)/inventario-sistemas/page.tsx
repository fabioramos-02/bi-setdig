import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { getInventarioSistemas } from "@/lib/data";
import { dataBR } from "@/lib/inventario-sistemas";
import { InventarioClient } from "./InventarioClient";

export const metadata: Metadata = {
  title: "Inventário de Sistemas | SETDIG",
};

const TITULO = "Inventário de Sistemas";

export default function InventarioSistemasPage() {
  const dados = getInventarioSistemas();

  if (dados.sistemas.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title={TITULO} />
        <main className="flex-1 p-6">
          <EmptyCard message="Ainda não há sistemas inventariados aqui." />
        </main>
      </div>
    );
  }

  const ref = dados.meta?.dataReferencia ? ` de ${dataBR(dados.meta.dataReferencia)}` : "";
  const filtro = `Inventário estadual de sistemas${ref}${dados.meta?.versao ? ` (versão ${dados.meta.versao.replace("v", "")})` : ""}`;

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title={TITULO}>
        <ExportarRelatorioButton filtro={filtro} />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6 min-w-0">
        <RelatorioCapa titulo={TITULO} filtro={filtro} />
        <p className="bi-caption mb-4" style={{ color: "var(--ds-color-text-secondary)" }}>{filtro}. Informações declaradas pelos órgãos, ainda em consolidação.</p>
        <InventarioClient dados={dados} />
      </main>
    </div>
  );
}
