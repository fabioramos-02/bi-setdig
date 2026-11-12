/** Tooltip posicionado pelo mouse — substitui `<title>` nativo do SVG (sem
 * estilo, sem tema). Reusável por qualquer gráfico com hover custom. */
export function ChartTooltip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="bi-tooltip"
      style={{
        position: "fixed",
        left: `max(.5rem, min(${x + 12}px, calc(100vw - 24rem - .5rem)))`,
        top: `max(.5rem, min(${y - 12}px, calc(100dvh - 8rem)))`,
        background: "var(--ds-color-text-primary)",
        color: "var(--ds-color-background)",
        borderRadius: "var(--ds-radius-sm)",
        padding: "6px 10px",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {children}
    </div>
  );
}
