const TONS = {
  primary: "var(--ds-color-primary-600)",
  digital: "var(--ds-color-success)",
  win: "#ff6200", // laranja — extensão local (DS não tem)
  info: "var(--ds-color-info)",
} as const;

/** KPI do censo: card com faixa colorida no topo + número grande. Réplica do
 * `.kpi` do site original. `tom` colore a faixa e o número (primary por padrão;
 * digital = verde do "% online"; win = laranja do "a um passo"). */
export function KpiCenso({
  label,
  value,
  sub,
  tom = "primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tom?: keyof typeof TONS;
}) {
  const cor = TONS[tom];
  return (
    <div
      style={{
        border: "1px solid var(--ds-color-border)",
        borderTop: `4px solid ${cor}`,
        borderRadius: "var(--ds-radius-md)",
        padding: "var(--ds-spacing-20)",
        background: "var(--ds-color-background)",
      }}
    >
      <div style={{ color: cor }} className="text-4xl font-bold leading-none">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>
      <div style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm mt-2 leading-snug">
        {label}
      </div>
      {sub && (
        <div style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}
