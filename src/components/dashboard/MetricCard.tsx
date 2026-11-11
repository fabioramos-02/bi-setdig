import type { LucideIcon } from "lucide-react";

/** Cartão de indicador. `cor` pinta a faixa do topo e o número (tom: ok, atenção, crítico);
 * `children` fica no rodapé (ex.: "De onde vem?"). Sem `cor`, é o cartão neutro de sempre. */
export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  cor,
  children,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  cor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        border: "1px solid var(--ds-color-border)",
        borderTop: cor ? `4px solid ${cor}` : undefined,
        borderRadius: "var(--ds-radius-md)",
        padding: "var(--ds-spacing-20)",
        background: "var(--ds-color-background)",
      }}
    >
      <div style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm mb-1 flex items-center gap-1.5">
        {Icon && <Icon size={16} aria-hidden style={{ color: "var(--ds-color-text-muted)" }} />}
        {label}
      </div>
      <div style={{ color: cor ?? "var(--ds-color-primary-600)" }} className="text-3xl font-semibold">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>
      {sub && (
        <div style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-1">
          {sub}
        </div>
      )}
      {children && <div className="mt-auto pt-2">{children}</div>}
    </div>
  );
}
