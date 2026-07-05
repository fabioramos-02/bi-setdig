/** Legenda de escala de cor do mapa — gradiente entre as 2 cores da mesma
 * escala scaleLog usada em ChoroplethMap, com rótulos min/máx. */
export function MapLegend({ min, max, corMin, corMax }: { min: number; max: number; corMin: string; corMax: string }) {
  return (
    <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
      <span>{min.toLocaleString("pt-BR")}</span>
      <div
        style={{ background: `linear-gradient(to right, ${corMin}, ${corMax})`, height: 8, width: 120, borderRadius: 4 }}
        aria-hidden="true"
      />
      <span>{max.toLocaleString("pt-BR")} visitas</span>
    </div>
  );
}
