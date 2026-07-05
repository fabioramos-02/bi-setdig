/** Tooltip posicionado pelo mouse — substitui `<title>` nativo do SVG (sem
 * estilo, sem tema). Reusável por qualquer gráfico com hover custom. */
export function ChartTooltip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        left: x + 12,
        top: y - 12,
        background: "var(--ds-color-text-primary)",
        color: "var(--ds-color-background)",
        borderRadius: "var(--ds-radius-sm)",
        padding: "6px 10px",
        fontSize: "12px",
        pointerEvents: "none",
        zIndex: 50,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}
