/**
 * Substitui o antigo PageHeader agora que a navegação (voltar, ThemeToggle)
 * mora na Sidebar global — esta barra é só título da página + ações
 * específicas dela (ex. ExportPdfButton), não navegação.
 */
export function ContentTopBar({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header
      style={{ background: "var(--ds-color-primary-600)" }}
      className="flex items-center justify-between px-6 py-4"
    >
      <h1 style={{ color: "var(--ds-color-text-inverse)" }} className="text-lg font-semibold">
        {title}
      </h1>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </header>
  );
}
