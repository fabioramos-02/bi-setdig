export function DashboardSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mb-4 break-inside-avoid">
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ color: "var(--ds-color-text-primary)" }} className="text-lg font-semibold">
          {title}
        </h2>
        {action}
      </div>
      <div
        style={{
          border: "1px solid var(--ds-color-border)",
          borderRadius: "var(--ds-radius-md)",
          background: "var(--ds-color-background)",
          padding: "var(--ds-spacing-20)",
        }}
      >
        {children}
      </div>
    </section>
  );
}
