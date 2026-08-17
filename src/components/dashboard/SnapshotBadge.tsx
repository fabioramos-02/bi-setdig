/** Selo informativo — deixa claro que o dado é um retrato do momento da
 *  extração e não atualiza em tempo real. Formato pt-BR, fuso America/Campo_Grande. */
export function SnapshotBadge({
  updatedAt,
  texto = "Dados atualizados em",
}: {
  updatedAt: string | null;
  texto?: string;
}) {
  if (!updatedAt) return null;
  const formato = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(new Date(updatedAt));
  return (
    <div
      className="text-xs inline-flex items-start gap-2 px-3 py-2 rounded mb-4"
      style={{
        background: "var(--ds-color-background-muted)",
        color: "var(--ds-color-text-muted)",
        border: "1px dashed var(--ds-color-border)",
      }}
    >
      <span aria-hidden style={{ color: "var(--ds-color-text-secondary)" }}>◷</span>
      <span>
        <strong>{texto} {formato}.</strong>{" "}
        Os números desta seção são um retrato do momento da extração — não atualizam em tempo real.
      </span>
    </div>
  );
}
