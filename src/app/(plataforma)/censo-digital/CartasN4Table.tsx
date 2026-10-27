"use client";

import { useMemo, useState } from "react";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { CATEGORIAS_N4, rotuloCategoriaN4, type CartaN4, type CategoriaN4 } from "@/lib/censo-n4";
import { Chip } from "./CartasTable";

/** Cartas nível 4 com a forma de pedido encontrada na carta e o trecho que
 * justificou (pra conferir a leitura automática). Chips por forma de pedido +
 * busca + CSV — molde de censo-digital/CartasTable. */
export function CartasN4Table({ cartas }: { cartas: CartaN4[] }) {
  // abre no caso-problema, se houver
  const [filtro, setFiltro] = useState<CategoriaN4 | undefined>(() =>
    cartas.some((c) => c.categoria === "formulario-email") ? "formulario-email" : undefined);
  const [busca, setBusca] = useState("");

  const contagem = useMemo(() => {
    const m = new Map<CategoriaN4, number>();
    for (const c of cartas) m.set(c.categoria, (m.get(c.categoria) ?? 0) + 1);
    return m;
  }, [cartas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cartas.filter((c) => {
      if (filtro && c.categoria !== filtro) return false;
      if (q && !`${c.orgaoSigla} ${c.titulo} ${c.evidencia ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cartas, filtro, busca]);

  const linhasCsv = useMemo(() => filtradas.map((c) => ({
    "Órgão": c.orgaoSigla,
    "Serviço": c.titulo,
    "Como o cidadão faz o pedido": rotuloCategoriaN4(c.categoria),
    "Trecho da carta": c.evidencia ?? "",
    "Pedidos por mês": c.demandaMensal ?? "",
    "Link": c.urlServico ?? "",
  })), [filtradas]);

  const colunas = useMemo<Coluna<CartaN4>[]>(() => [
    {
      key: "carta", label: "Serviço", sortable: true, sortValue: (c) => `${c.orgaoSigla} ${c.titulo}`,
      render: (c) => (
        <div className="min-w-0">
          <span className="text-xs font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>{c.orgaoSigla}</span>
          <p className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>{c.titulo}</p>
        </div>
      ),
    },
    {
      key: "categoria", label: "Como pede", sortable: true, sortValue: (c) => c.categoria,
      render: (c) => {
        const cor = CATEGORIAS_N4.find((x) => x.id === c.categoria)?.cor;
        return <span className="text-xs font-semibold" style={{ color: cor }}>{rotuloCategoriaN4(c.categoria)}</span>;
      },
    },
    {
      key: "evidencia", label: "Por que (trecho da carta)",
      render: (c) => (
        <span className="text-xs line-clamp-3" style={{ color: "var(--ds-color-text-secondary)" }} title={c.evidencia ?? undefined}>
          {c.evidencia ? `“…${c.evidencia}…”` : "—"}
        </span>
      ),
    },
    {
      key: "demanda", label: "Pedidos por mês", align: "right", sortable: true, sortValue: (c) => c.demandaMensal ?? -1,
      render: (c) => (
        <span className="text-sm" style={{ color: c.demandaMensal !== null ? "var(--ds-color-text-primary)" : "var(--ds-color-text-muted)" }}>
          {c.demandaMensal !== null ? c.demandaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}
        </span>
      ),
    },
    {
      key: "portal", label: "Portal", align: "center",
      render: (c) => (
        c.urlServico ? (
          <a
            href={c.urlServico} target="_blank" rel="noopener noreferrer"
            className="text-[var(--ds-color-primary-600)] hover:underline inline-flex items-center justify-center"
            title="Abrir serviço no portal" aria-label="Abrir serviço no portal"
          >
            <span className="material-icons text-lg" aria-hidden>open_in_new</span>
          </a>
        ) : <span style={{ color: "var(--ds-color-text-muted)" }}>—</span>
      ),
    },
  ], []);

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar órgão, serviço ou trecho…"
          className="w-full min-w-0 flex-1 rounded-md px-3 py-2 text-sm"
          style={{ border: "1px solid var(--ds-color-border)", background: "var(--ds-color-background)", color: "var(--ds-color-text-primary)" }}
        />
        <div className="shrink-0">
          <ExportCsvButton rows={linhasCsv} filename="nivel-4-na-pratica" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip ativo={filtro === undefined} onClick={() => setFiltro(undefined)}>Todos ({cartas.length})</Chip>
        {CATEGORIAS_N4.filter((c) => contagem.get(c.id)).map((c) => (
          <Chip key={c.id} ativo={filtro === c.id} cor={c.cor} onClick={() => setFiltro(filtro === c.id ? undefined : c.id)}>
            {c.rotulo} ({contagem.get(c.id)})
          </Chip>
        ))}
      </div>

      <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
        Mostrando {filtradas.length.toLocaleString("pt-BR")} de {cartas.length.toLocaleString("pt-BR")} serviços.
        Comece pelos que têm mais pedidos por mês.
      </p>

      <div className="overflow-x-auto">
        <DataTable columns={colunas} rows={filtradas} rowKey={(c) => c.id} />
      </div>
    </div>
  );
}
