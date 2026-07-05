import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";

export const metadata: Metadata = {
  title: "Qualidade | SETDIG",
};

export default function QualidadePage() {
  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Qualidade" />
      <main className="flex-1 p-6">
        <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
      </main>
    </div>
  );
}
