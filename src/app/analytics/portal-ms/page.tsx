import type { Metadata } from "next";
import { PageHeader } from "@/components/ds/PageHeader";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { getMatomoVisitasResumo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Analytics — Portal MS | SETDIG",
};

export default function AnalyticsPortalMsPage() {
  const rows = getMatomoVisitasResumo();
  const resumo = rows?.[0];

  return (
    <div className="flex flex-col flex-1">
      <PageHeader title="Analytics — Portal MS" />
      <main className="flex-1 p-6">
        {resumo ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Visitas (mês atual)" value={resumo.visitas} />
            <MetricCard label="Visitantes únicos" value={resumo.visitantesUnicos} />
            <MetricCard label="Ações" value={resumo.acoes} />
          </div>
        ) : (
          <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
        )}
      </main>
    </div>
  );
}
