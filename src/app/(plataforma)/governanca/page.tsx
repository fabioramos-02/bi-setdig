import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";

export const metadata: Metadata = {
  title: "Governança | SETDIG",
};

export default function GovernancaPage() {
  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Governança" />
      <main className="flex-1 p-6">
        <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
      </main>
    </div>
  );
}
