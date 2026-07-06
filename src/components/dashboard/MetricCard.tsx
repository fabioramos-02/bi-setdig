export function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--ds-color-border)",
        borderRadius: "var(--ds-radius-md)",
        padding: "var(--ds-spacing-20)",
        background: "var(--ds-color-background)",
      }}
    >
      <div style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm mb-1">
        {label}
      </div>
      <div style={{ color: "var(--ds-color-primary-600)" }} className="text-3xl font-semibold">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>
      {sub && (
        <div style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}
