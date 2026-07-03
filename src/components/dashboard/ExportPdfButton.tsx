"use client";

export function ExportPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden text-sm font-semibold"
      style={{ color: "var(--ds-color-text-inverse)" }}
    >
      🖨 Exportar PDF
    </button>
  );
}
