import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import {
  getCartasInventarioResumo,
  getCartasInventarioPorOrgao,
  getCartasInventarioPorCategoria,
  getCartasInventarioRelacao,
  getCartasJornadaResumo,
} from "@/lib/data";
import { ServicosClient } from "./ServicosClient";

export const metadata: Metadata = {
  title: "Serviços | SETDIG",
};

export default function ServicosPage() {
  const resumo = getCartasInventarioResumo();
  const orgaos = getCartasInventarioPorOrgao();
  const categorias = getCartasInventarioPorCategoria();
  const relacao = getCartasInventarioRelacao();
  const jornada = getCartasJornadaResumo();

  if (!resumo) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Serviços" />
        <main className="flex-1 p-6">
          <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
        </main>
      </div>
    );
  }

  return <ServicosClient resumo={resumo} orgaos={orgaos} categorias={categorias} relacao={relacao} jornada={jornada} />;
}
