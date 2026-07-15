import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { getCartasInventarioResumo, getCartasInventarioPorOrgao, getCartasInventarioRelacao } from "@/lib/data";
import { ServicosClient } from "./ServicosClient";

export const metadata: Metadata = {
  title: "Serviços | SETDIG",
};

export default function ServicosPage() {
  const resumo = getCartasInventarioResumo();
  const orgaos = getCartasInventarioPorOrgao();
  const relacao = getCartasInventarioRelacao();

  if (!resumo) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Serviços" />
        <main className="flex-1 p-6">
          <EmptyCard message="Ainda não há dados disponíveis aqui." />
        </main>
      </div>
    );
  }

  return <ServicosClient resumo={resumo} orgaos={orgaos} relacao={relacao} />;
}
