"use client";

import { useState } from "react";
import { Modal } from "@/components/dashboard/Modal";
import { idsExcluidos, formatarExtracao, nomeArquivoRelatorio, type SecaoExport } from "@/lib/relatorio";

export type { SecaoExport };

/** Abre um modal onde o usuário escolhe quais seções (abas) entram no relatório —
 * a aba atual já vem marcada. Ao gerar, marca os painéis não escolhidos com
 * `.exportar-excluir` (somem no @media print, ver globals.css) e chama
 * window.print() de forma síncrona. Usa os `id="panel-<id>"` que o Tabs emite.
 *
 * Sem `secoes` (páginas sem abas, ex. Censo), o clique imprime direto — a capa
 * (RelatorioCapa) e o filtro cuidam da identidade do PDF.
 *
 * `filtro` é o recorte atual (período/órgão) — mostrado no modal e na capa. */
export function ExportarRelatorioButton({
  secoes = [],
  ativaId,
  filtro,
}: {
  secoes?: SecaoExport[];
  ativaId?: string;
  filtro?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(ativaId ? [ativaId] : []));

  const temAbas = secoes.length > 1;

  const imprimir = (excluidos: string[]) => {
    setGerando(true);
    for (const id of excluidos) document.getElementById(`panel-${id}`)?.classList.add("exportar-excluir");
    // O navegador usa o document.title como nome padrão do PDF — troca pra
    // refletir o que entra no relatório e restaura depois. `secoes` mantém a
    // ordem das abas; filtra pelas que ficaram (não estão em `excluidos`).
    const tituloOriginal = document.title;
    const excluidosSet = new Set(excluidos);
    const incluidas = secoes.filter((s) => !excluidosSet.has(s.id));
    document.title = nomeArquivoRelatorio(tituloOriginal, incluidas, secoes.length);
    try {
      window.print(); // bloqueante — retorna quando o diálogo de impressão fecha
    } finally {
      document.title = tituloOriginal;
      for (const id of excluidos) document.getElementById(`panel-${id}`)?.classList.remove("exportar-excluir");
      setGerando(false);
      setAberto(false);
    }
  };

  const clicar = () => {
    if (!temAbas) return imprimir([]); // sem abas: gera direto
    setSelecionadas(new Set(ativaId ? [ativaId] : secoes.map((s) => s.id)));
    setAberto(true);
  };

  const alternar = (id: string) =>
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });

  const todasMarcadas = selecionadas.size === secoes.length;
  const alternarTodas = () => setSelecionadas(todasMarcadas ? new Set() : new Set(secoes.map((s) => s.id)));

  return (
    <>
      <button
        type="button"
        onClick={clicar}
        className="print:hidden text-sm font-semibold flex items-center gap-1.5"
        style={{ color: "var(--ds-color-text-inverse)" }}
      >
        <span className="material-icons" style={{ fontSize: 18 }} aria-hidden>print</span>
        Exportar Relatório
      </button>

      <Modal open={aberto} onClose={() => setAberto(false)} title="Exportar Relatório">
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Escolha as seções que entram no relatório em PDF.
          </p>

          {filtro && (
            <p className="text-xs rounded-md px-3 py-2" style={{ background: "var(--ds-color-background-muted)", color: "var(--ds-color-text-secondary)" }}>
              Recorte do relatório: <strong style={{ color: "var(--ds-color-text-primary)" }}>{filtro}</strong> · extraído em {formatarExtracao(new Date())}.
            </p>
          )}

          <label
            className="flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer text-sm font-semibold"
            style={{ background: "var(--ds-color-background-muted)", color: "var(--ds-color-text-primary)" }}
          >
            <input type="checkbox" checked={todasMarcadas} onChange={alternarTodas} className="w-4 h-4" style={{ accentColor: "var(--ds-color-primary-600)" }} />
            Selecionar todas as seções
          </label>

          <ul className="flex flex-col">
            {secoes.map((s) => (
              <li key={s.id}>
                <label
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm"
                  style={{ color: "var(--ds-color-text-primary)", borderTop: "1px solid var(--ds-color-border)" }}
                >
                  <input type="checkbox" checked={selecionadas.has(s.id)} onChange={() => alternar(s.id)} className="w-4 h-4" style={{ accentColor: "var(--ds-color-primary-600)" }} />
                  {s.label}
                </label>
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAberto(false)} className="ds-button ds-button--ghost">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => imprimir(idsExcluidos(secoes, selecionadas))}
              disabled={selecionadas.size === 0 || gerando}
              className="ds-button ds-button--primary"
            >
              {gerando ? "Gerando…" : "Gerar PDF"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
