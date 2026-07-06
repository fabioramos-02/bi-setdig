import { BarChart } from "@/components/charts/BarChart";
import type { InsightPlataforma } from "@/lib/insights";
import type { Plataforma, HorarioGa4 } from "@/lib/data";

export function PerfilTab({
  plataforma,
  horarios,
  insightPlataforma,
}: {
  plataforma: Plataforma[];
  horarios: HorarioGa4[];
  insightPlataforma: InsightPlataforma | null;
}) {
  const horariosRotulados = horarios.map((h) => ({ ...h, hora: `${h.hora}h` }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Plataforma
          </h3>
          {insightPlataforma && (
            <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mb-2">
              {insightPlataforma.operatingSystem} é a plataforma de {insightPlataforma.participacaoPct.toFixed(0)}% dos usuários.
            </p>
          )}
          <BarChart data={plataforma} xKey="operatingSystem" yKey="activeUsers" height={260} />
        </div>
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Horário de uso
          </h3>
          <BarChart data={horariosRotulados} xKey="hora" yKey="sessoes" height={260} />
        </div>
      </div>
    </div>
  );
}
