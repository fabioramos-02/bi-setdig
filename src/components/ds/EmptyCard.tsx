export function EmptyCard({ message }: { message: string }) {
  return (
    <div
      style={{
        border: "1px dashed var(--ds-color-border)",
        borderRadius: "var(--ds-radius-md)",
        padding: "var(--ds-spacing-48)",
        color: "var(--ds-color-text-muted)",
        background: "var(--ds-color-background-muted)",
      }}
      className="flex flex-col items-center justify-center text-center gap-2"
    >
      <span className="text-sm">{message}</span>
    </div>
  );
}
