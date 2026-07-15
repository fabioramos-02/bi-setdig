"use client";

import { useState } from "react";

export type Coluna<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
};

/** Tabela genérica de apresentação — recebe linhas já filtradas/paginadas do
 * chamador (o Tab é quem tem esse estado), só cuida de renderizar colunas e
 * ordenar por clique no cabeçalho. Não filtra, não pagina. Visual: container
 * com borda/raio (não table crua "solta"), cabeçalho com fundo destacado,
 * linha com hover — tokens DS, sem classe de componente do pacote (`.card`
 * não cabe bem aqui, ver gotcha do design-system-ms sobre migrar layout
 * bespoke: tokens primeiro, classe de componente só quando encaixa sem
 * conflito). */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: Coluna<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  const [ordem, setOrdem] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const colunaOrdenada = ordem ? columns.find((c) => c.key === ordem.key) : undefined;
  const linhas =
    colunaOrdenada?.sortValue && ordem
      ? [...rows].sort((a, b) => {
          const va = colunaOrdenada.sortValue!(a);
          const vb = colunaOrdenada.sortValue!(b);
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
          return ordem.dir === "asc" ? cmp : -cmp;
        })
      : rows;

  const alternarOrdem = (col: Coluna<T>) => {
    if (!col.sortable) return;
    setOrdem((atual) =>
      atual?.key === col.key ? { key: col.key, dir: atual.dir === "asc" ? "desc" : "asc" } : { key: col.key, dir: "desc" },
    );
  };

  return (
    <div style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", overflow: "hidden" }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: "var(--ds-color-background-muted)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => alternarOrdem(col)}
                className={`py-3 px-3 text-xs font-semibold uppercase tracking-wide ${col.align === "right" ? "text-right" : "text-left"} ${col.sortable ? "cursor-pointer select-none" : ""}`}
                style={{ color: "var(--ds-color-text-secondary)" }}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <span
                      className="material-icons"
                      style={{ fontSize: 14, opacity: ordem?.key === col.key ? 1 : 0.35 }}
                      aria-hidden
                    >
                      {ordem?.key === col.key && ordem.dir === "asc" ? "arrow_upward" : "arrow_downward"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((row) => (
            <tr
              key={rowKey(row)}
              className="align-top transition-colors data-table-row"
              style={{ borderTop: "1px solid var(--ds-color-border)" }}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-3 ${col.align === "right" ? "text-right" : ""}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
