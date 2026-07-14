import type { StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";

/** Skeleton do tamanho do gráfico que ele substitui — evita layout shift
 * (padrão de BI: Grafana/Power BI/Looker mostram um placeholder do TAMANHO
 * do painel, não um spinner solto). Barras de altura variável dão uma pista
 * visual de "gráfico carregando" sem simular dado real. */
function ChartSkeleton({ height }: { height: number }) {
  const alturas = [55, 80, 40, 95, 65, 85, 50, 70]; // %, puramente decorativo
  return (
    <div
      className="flex items-end gap-2 rounded animate-pulse"
      style={{ height, padding: "var(--ds-spacing-12)", background: "var(--ds-color-background-muted)" }}
      role="status"
      aria-label="Carregando gráfico…"
    >
      {alturas.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${h}%`, background: "var(--ds-color-border)" }}
        />
      ))}
    </div>
  );
}

/**
 * Wrapper de composição: envolve QUALQUER componente de gráfico (props de
 * dados não são uniformes entre eles — data/dados/cidades/itens/termos — por
 * isso a solução é por fora, sem tocar em components/charts/*). Reusa o
 * StatusIntervalo que já flui Client → Tab (ver AvisoSnapshotAproximado) —
 * nenhuma prop nova pra threadear pelos Clients.
 */
export function ChartLoading({
  status,
  height,
  children,
}: {
  status: StatusIntervalo;
  height: number;
  children: React.ReactNode;
}) {
  if (status === "carregando") return <ChartSkeleton height={height} />;
  return children;
}
