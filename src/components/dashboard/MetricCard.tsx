export function MetricCard({ label, value }: { label: string; value: string | number }) {
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
    </div>
  );
}
