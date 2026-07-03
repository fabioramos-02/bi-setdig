import Link from "next/link";
import { ThemeToggle } from "@/components/ds/ThemeToggle";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";

export function PageHeader({ title, exportable = false }: { title: string; exportable?: boolean }) {
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
          className="text-sm hover:underline print:hidden"
        >
          ← Portal
        </Link>
        <h1 style={{ color: "var(--ds-color-text-inverse)" }} className="text-lg font-semibold">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {exportable && <ExportPdfButton />}
        <div className="print:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
