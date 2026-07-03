import type { Metadata } from "next";
import { PageHeader } from "@/components/ds/PageHeader";
import { EmptyCard } from "@/components/ds/EmptyCard";

export const metadata: Metadata = {
  title: "Analytics — MS Digital | SETDIG",
};

export default function AnalyticsMsDigitalPage() {
  return (
    <div className="flex flex-col flex-1">
      <PageHeader title="Analytics — MS Digital" />
      <main className="flex-1 p-6">
        <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
      </main>
    </div>
  );
}
