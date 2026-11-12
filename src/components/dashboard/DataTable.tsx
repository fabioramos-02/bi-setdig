"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { filtrarOrdenarLinhas, paginarLinhas } from "@/lib/table-view";

export type Coluna<T> = { key: string; label: string; align?: "left" | "center" | "right"; sortable?: boolean; sortValue?: (row: T) => string | number; render: (row: T) => React.ReactNode };

/** Consulta opt-in; imprimir conserva a coleção filtrada/ordenada inteira. */
export function DataTable<T>({ columns, rows, rowKey, rowId, onRowClick, pageSize, searchText, label = "Registros", horizontalScroll = false }: {
  columns: Coluna<T>[]; rows: T[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void;
  pageSize?: number; searchText?: (row: T) => string; label?: string; horizontalScroll?: boolean; rowId?: (row: T) => string;
}) {
  const [ordem, setOrdem] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [imprimindo, setImprimindo] = useState(false);
  useEffect(() => {
    const antes = () => flushSync(() => setImprimindo(true));
    const depois = () => setImprimindo(false);
    window.addEventListener("beforeprint", antes); window.addEventListener("afterprint", depois);
    return () => { window.removeEventListener("beforeprint", antes); window.removeEventListener("afterprint", depois); };
  }, []);
  const col = ordem ? columns.find((c) => c.key === ordem.key) : undefined;
  const comparar = col?.sortValue && ordem ? (a: T, b: T) => {
    const va = col.sortValue!(a), vb = col.sortValue!(b);
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return ordem.dir === "asc" ? cmp : -cmp;
  } : undefined;
  const filtradas = filtrarOrdenarLinhas(rows, busca, searchText, comparar);
  const p = paginarLinhas(filtradas, pagina, pageSize);
  const linhas = imprimindo ? filtradas : p.linhas;
  const ordenar = (c: Coluna<T>) => { setPagina(1); setOrdem((a) => a?.key === c.key ? { key: c.key, dir: a.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "desc" }); };
  return <div className="min-w-0">
    {(searchText || pageSize) && <div className="flex flex-wrap items-center gap-3 mb-3 print:hidden">
      {searchText && <label className="flex-1 min-w-0"><span className="block text-sm mb-1">Buscar em {label.toLocaleLowerCase("pt-BR")}</span>
        <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} className="ds-input w-full" placeholder="Nome, número ou responsável" /></label>}
      <span className="text-sm" aria-live="polite">{p.inicio}–{p.fim} de {p.total} {label.toLocaleLowerCase("pt-BR")}</span>
    </div>}
    <div className={`${horizontalScroll ? "overflow-x-auto" : "overflow-hidden"} data-table-container print:overflow-visible`}
      tabIndex={horizontalScroll ? 0 : undefined} role={horizontalScroll ? "region" : undefined} aria-label={horizontalScroll ? `${label}: tabela com rolagem horizontal` : undefined}
      style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)" }}>
      <table className="w-full text-sm border-collapse"><thead><tr style={{ background: "var(--ds-color-background-muted)" }}>
        {columns.map((c) => <th key={c.key} scope="col" aria-sort={c.sortable ? ordem?.key === c.key ? ordem.dir === "asc" ? "ascending" : "descending" : "none" : undefined}
          className={`py-3 px-3 text-xs font-semibold uppercase tracking-wide ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`} style={{ color: "var(--ds-color-text-secondary)" }}>
          {c.sortable ? <button type="button" onClick={() => ordenar(c)} className="inline-flex items-center gap-1 text-inherit" aria-label={`Ordenar por ${c.label}`}>
            {c.label}<span aria-hidden className="material-icons" style={{ fontSize: 14, opacity: ordem?.key === c.key ? 1 : 0.35 }}>{ordem?.key === c.key && ordem.dir === "asc" ? "arrow_upward" : "arrow_downward"}</span>
          </button> : c.label}</th>)}
        {onRowClick && <th scope="col" className="py-3 px-3 text-sm">Detalhe</th>}
      </tr></thead><tbody>
        {linhas.map((row) => <tr key={rowKey(row)} id={rowId?.(row)} tabIndex={rowId ? -1 : undefined} className={`align-top data-table-row ${onRowClick ? "cursor-pointer" : ""}`} style={{ borderTop: "1px solid var(--ds-color-border)" }}
          onClick={onRowClick ? (e) => { if (!(e.target as Element).closest("a,button,input,select")) onRowClick(row); } : undefined}>
          {columns.map((c) => <td key={c.key} className={`py-3 px-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>{c.render(row)}</td>)}
          {onRowClick && <td className="py-3 px-3"><button type="button" className="underline text-sm" onClick={() => onRowClick(row)} aria-label={`Ver detalhes de ${rowKey(row)}`} style={{ color: "var(--ds-color-primary-600)" }}>Detalhes</button></td>}
        </tr>)}
        {linhas.length === 0 && <tr><td colSpan={columns.length + (onRowClick ? 1 : 0)} className="p-4 text-sm">Nenhum registro corresponde aos filtros aplicados.</td></tr>}
      </tbody></table>
    </div>
    {pageSize && p.paginas > 1 && <nav aria-label={`Páginas de ${label.toLocaleLowerCase("pt-BR")}`} className="flex flex-wrap items-center justify-between gap-3 mt-3 text-sm print:hidden">
      <button type="button" className="ds-button ds-button--ghost" disabled={p.pagina === 1} onClick={() => setPagina(p.pagina - 1)}>Anterior</button>
      <span aria-live="polite">Página {p.pagina} de {p.paginas}</span>
      <button type="button" className="ds-button ds-button--ghost" disabled={p.pagina === p.paginas} onClick={() => setPagina(p.pagina + 1)}>Próxima</button>
    </nav>}
  </div>;
}
