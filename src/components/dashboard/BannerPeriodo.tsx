import { Calendar } from "lucide-react";

/** Banner fino no topo da aba informando o período aplicado.
 *  Não duplica o controle: o filtro segue vivendo na Sidebar. Sinaliza
 *  visualmente onde a aba respeita o filtro (blocos dinâmicos abaixo). */
export function BannerPeriodo({ rotulo }: { rotulo: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "var(--ds-color-primary-50, #eef4fb)",
        border: "1px solid var(--ds-color-primary-100, var(--ds-color-border))",
        borderRadius: "var(--ds-radius-md)",
        padding: "var(--ds-spacing-12) var(--ds-spacing-16)",
      }}
      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm"
    >
      <span
        style={{ color: "var(--ds-color-text-primary)" }}
        className="flex items-center gap-2 font-medium"
      >
        <Calendar size={16} aria-hidden style={{ color: "var(--ds-color-primary-600)" }} />
        Período aplicado: {rotulo}
      </span>
      <span style={{ color: "var(--ds-color-text-secondary)" }} className="text-xs">
        Altere na barra lateral →
      </span>
    </div>
  );
}
