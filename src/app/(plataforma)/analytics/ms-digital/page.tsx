import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MsDigitalClient } from "./MsDigitalClient";
import { getGa4VisaoGeral, getGa4Plataforma, getGa4Servicos, getGa4Funil, getGa4Horarios } from "@/lib/data";

export const metadata: Metadata = {
  title: "Analytics — MS Digital | SETDIG",
};

export default function AnalyticsMsDigitalPage() {
  const visaoGeral = getGa4VisaoGeral() ?? [];
  const plataforma = getGa4Plataforma();
  const servicos = getGa4Servicos();
  const funil = getGa4Funil();
  const horarios = getGa4Horarios();

  if (visaoGeral.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Analytics — MS Digital" />
        <main className="flex-1 p-6">
          <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
        </main>
      </div>
    );
  }

  return (
    <MsDigitalClient visaoGeral={visaoGeral} plataforma={plataforma} servicos={servicos} funil={funil} horarios={horarios} />
  );
}
