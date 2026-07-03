import Link from "next/link";
import { ThemeToggle } from "@/components/ds/ThemeToggle";

export function PageHeader({ title }: { title: string }) {
  return (
    <header
      style={{ background: "var(--ds-color-primary-600)" }}
      className="flex items-center justify-between px-6 py-4"
    >
      <div className="flex items-center gap-4">
        <Link
          href="/"
          aria-label="Voltar para o portal"
          style={{ color: "var(--ds-color-text-inverse)" }}
          className="text-sm hover:underline"
        >
          ← Portal
        </Link>
        <h1 style={{ color: "var(--ds-color-text-inverse)" }} className="text-lg font-semibold">
          {title}
        </h1>
      </div>
      <ThemeToggle />
    </header>
  );
}
