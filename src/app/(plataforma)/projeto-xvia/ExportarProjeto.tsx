"use client";
import { useState } from "react";
import { flushSync } from "react-dom";
import { Modal } from "@/components/dashboard/Modal";
import { ExportarRelatorioButton, type SecaoExport } from "@/components/dashboard/ExportarRelatorioButton";

export type ModoExportacao = "resumo" | "completo" | null;
export function ExportarProjeto({ secoes, ativaId, filtro, onModo }: { secoes: SecaoExport[]; ativaId: string; filtro: string; onModo: (modo: ModoExportacao) => void }) {
  const [aberto, setAberto] = useState(false);
  const imprimir = (modo: Exclude<ModoExportacao, null>) => {
    const titulo = document.title;
    flushSync(() => { setAberto(false); onModo(modo); });
    document.title = `Projeto X-VIA — ${modo === "resumo" ? "Resumo executivo" : "Relatório mensal completo"}`;
    try { window.print(); } finally { document.title = titulo; onModo(null); }
  };
  return <>
    <button type="button" className="bi-body font-semibold min-h-11" onClick={() => setAberto(true)} style={{ color: "var(--ds-color-text-inverse)" }}>Exportar</button>
    <Modal open={aberto} onClose={() => setAberto(false)} title="Exportar projeto X-VIA">
      <p className="bi-body">{filtro}</p>
      <div className="flex flex-col gap-3">
        <button type="button" className="ds-button ds-button--primary" onClick={() => imprimir("resumo")}>Resumo executivo</button>
        <button type="button" className="ds-button ds-button--secondary" onClick={() => imprimir("completo")}>Relatório mensal completo — 11 seções</button>
        {secoes.length > 1 && <div className="p-3 rounded" style={{ background: "var(--ds-color-primary-600)" }}>
          <ExportarRelatorioButton secoes={secoes} ativaId={ativaId} filtro={filtro} />
        </div>}
      </div>
      <p className="bi-body mt-3">O relatório completo preserva o contexto do contrato, a execução mensal, entregas, cronograma, prazos de atendimento e financeiro. Os filtros aplicados acompanham a exportação.</p>
    </Modal>
  </>;
}
