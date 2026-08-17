/**
 * Storytelling — réplica do padrão bench-carta/src/ui/sections.py::story():
 * frase-âncora + caption + "Como ler". Componente de apresentação puro, sem
 * cálculo (isso fica em lib/insights.ts).
 */
export function StoryCard({
  anchor,
  caption,
  children,
  comoLer,
  snapshot = false,
}: {
  anchor: React.ReactNode;
  caption?: string;
  children?: React.ReactNode;
  comoLer: string;
  /** Marca visual pra dados estáticos (snapshot) — fundo tint + borda tracejada,
   *  reforça a semântica do SnapshotBadge. */
  snapshot?: boolean;
}) {
  const background = snapshot
    ? "var(--ds-color-warning-50, #fff8e1)"
    : "var(--ds-color-background)";
  const border = snapshot
    ? "1px dashed var(--ds-color-warning, #d97706)"
    : "1px solid var(--ds-color-border)";
  return (
    <div
      style={{
        border,
        borderRadius: "var(--ds-radius-md)",
        padding: "var(--ds-spacing-20)",
        background,
      }}
      className="break-inside-avoid"
    >
      <p style={{ color: "var(--ds-color-text-primary)" }} className="text-lg font-semibold">
        {anchor}
      </p>
      {caption && (
        <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm mt-1">
          {caption}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
      <div
        style={{ background: "var(--ds-color-background-muted)", borderRadius: "var(--ds-radius-sm)", padding: "var(--ds-spacing-12)" }}
        className="mt-4 text-sm"
      >
        <strong>Como ler:</strong> {comoLer}
      </div>
    </div>
  );
}
