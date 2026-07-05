import type { Metadata } from "next";
import { PageHeader } from "@/components/ds/PageHeader";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { getGa4VisaoGeral } from "@/lib/data";

export const metadata: Metadata = {
  title: "Analytics — MS Digital | SETDIG",
};

export default function AnalyticsMsDigitalPage() {
  const rows = getGa4VisaoGeral() ?? [];
  const totalUsers = rows.reduce((acc, r) => acc + r.activeUsers, 0);
  const totalSessions = rows.reduce((acc, r) => acc + r.sessions, 0);
  const totalViews = rows.reduce((acc, r) => acc + r.screenPageViews, 0);

  return (
    <div className="flex flex-col flex-1">
      <PageHeader title="Analytics — MS Digital" />
      <main className="flex-1 p-6">
        {rows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Usuários ativos (30 dias)" value={totalUsers} />
            <MetricCard label="Sessões" value={totalSessions} />
            <MetricCard label="Visualizações de tela" value={totalViews} />
          </div>
        ) : (
          <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
        )}
      </main>
    </div>
  );
}
