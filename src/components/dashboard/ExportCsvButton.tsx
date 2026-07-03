"use client";

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.join(";"), ...rows.map((r) => headers.map((h) => escape(r[h])).join(";"))];
  return lines.join("\n");
}

export function ExportCsvButton({ rows, filename }: { rows: Record<string, string | number>[]; filename: string }) {
  const handleClick = () => {
    const csv = "﻿" + toCsv(rows); // BOM — abre certo no Excel PT-BR
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="print:hidden text-sm hover:underline"
      style={{ color: "var(--ds-color-primary-600)" }}
    >
      ⬇ Exportar CSV
    </button>
  );
}
