import type { Metadata } from "next";
import { PageHeader } from "@/components/ds/PageHeader";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { TrendFilter } from "@/components/dashboard/TrendFilter";
import { BarChart } from "@/components/charts/BarChart";
import {
  getMatomoVisitasResumo,
  getMatomoVisitasDiarias,
  getMatomoGeografia,
  getMatomoNavegadores,
  getMatomoDispositivos,
  getMatomoHorarios,
  getMatomoPaginas,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Analytics — Portal MS | SETDIG",
};

export default function AnalyticsPortalMsPage() {
  const resumo = getMatomoVisitasResumo()?.[0];
  const diarias = getMatomoVisitasDiarias();
  const cidades = getMatomoGeografia();
  const navegadores = getMatomoNavegadores();
  const dispositivos = getMatomoDispositivos();
  const horarios = getMatomoHorarios();
  const paginas = getMatomoPaginas();

  if (!resumo) {
    return (
      <div className="flex flex-col flex-1">
        <PageHeader title="Analytics — Portal MS" />
        <main className="flex-1 p-6">
          <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <PageHeader title="Analytics — Portal MS" exportable />
      <main className="flex-1 p-4 sm:p-6">
        <DashboardSection title="Visão geral (mês atual)">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard label="Visitas" value={resumo.visitas} />
            <MetricCard label="Visitantes únicos" value={resumo.visitantesUnicos} />
            <MetricCard label="Ações" value={resumo.acoes} />
          </div>
        </DashboardSection>

        {diarias.length > 0 && (
          <DashboardSection title="Tendência de visitas (últimos 90 dias)">
            <TrendFilter dados={diarias} />
          </DashboardSection>
        )}

        <DashboardSection title="Perfil do cidadão">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Top cidades (MS)
              </h3>
              <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
                {cidades.slice(0, 10).map((c) => (
                  <li key={c.cidade} className="flex justify-between border-b py-1" style={{ borderColor: "var(--ds-color-border)" }}>
                    <span>{c.cidade}</span>
                    <span style={{ color: "var(--ds-color-primary-600)" }} className="font-semibold">
                      {c.visitas.toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Navegadores
              </h3>
              <BarChart data={navegadores} xKey="navegador" yKey="visitas" height={220} />
            </div>
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Dispositivos
              </h3>
              <BarChart data={dispositivos} xKey="dispositivo" yKey="visitas" height={220} />
            </div>
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Horário de acesso
              </h3>
              <BarChart data={horarios} xKey="hora" yKey="visitas" height={220} />
            </div>
          </div>
        </DashboardSection>

        <DashboardSection
          title="Páginas mais acessadas"
          action={<ExportCsvButton rows={paginas} filename="paginas-mais-acessadas" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                  <th className="pb-2">Página</th>
                  <th className="pb-2 text-right">Visitas</th>
                </tr>
              </thead>
              <tbody>
                {paginas.map((p) => (
                  <tr key={p.url} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                    <td className="py-1.5 truncate max-w-[240px] sm:max-w-none">{p.url}</td>
                    <td className="py-1.5 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                      {p.visitas.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardSection>
      </main>
    </div>
  );
}
