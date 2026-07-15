/**
 * Substitui o antigo PageHeader agora que a navegação (voltar, ThemeToggle)
 * mora na Sidebar global — esta barra é só título da página + ações
 * específicas dela (ex. ExportPdfButton), não navegação.
 */
export function ContentTopBar({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header
      style={{ background: "var(--ds-color-primary-600)" }}
      className="flex items-center justify-between gap-2 px-4 md:px-6 pl-16 md:pl-6 h-[72px]"
    >
      <h1 style={{ color: "var(--ds-color-text-inverse)" }} className="text-base sm:text-lg font-semibold truncate min-w-0">
        {title}
      </h1>
      {children && <div className="flex items-center gap-4 shrink-0">{children}</div>}
    </header>
  );
}
