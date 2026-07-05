import type { Metadata } from "next";
import { PageHeader } from "@/components/ds/PageHeader";
import { EmptyCard } from "@/components/ds/EmptyCard";

export const metadata: Metadata = {
  title: "Serviços | SETDIG",
};

export default function ServicosPage() {
  return (
    <div className="flex flex-col flex-1">
      <PageHeader title="Serviços" />
      <main className="flex-1 p-6">
        <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
      </main>
    </div>
  );
}
