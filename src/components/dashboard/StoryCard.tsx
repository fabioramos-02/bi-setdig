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
}: {
  anchor: React.ReactNode;
  caption?: string;
  children?: React.ReactNode;
  comoLer: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--ds-color-border)",
        borderRadius: "var(--ds-radius-md)",
        padding: "var(--ds-spacing-20)",
        background: "var(--ds-color-background)",
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
