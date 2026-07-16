"use client";

import { useEffect, useRef } from "react";

/** Wrapper fino sobre <dialog> nativo — showModal()/close() dão backdrop, ESC
 * pra fechar e foco preso de graça, sem precisar de biblioteca. Não existe
 * componente de modal no DS-MS vendorizado, então estiliza só com var(--ds-*)
 * (mesma linha do resto do projeto quando a classe do pacote não encaixa). */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicar no backdrop (fora do card) fecha — o <dialog> em si cobre a
        // tela toda quando showModal(), então clique direto no elemento (não
        // num filho) é sempre backdrop.
        if (e.target === ref.current) onClose();
      }}
      className="backdrop:bg-black/50 backdrop:backdrop-blur-sm p-0 max-h-[85vh] print:hidden"
      style={{
        border: "1px solid var(--ds-color-border)",
        borderRadius: "var(--ds-radius-md)",
        background: "var(--ds-color-background)",
        color: "var(--ds-color-text-primary)",
        width: "min(560px, 92vw)",
        // Centraliza de forma confiável — o padrão de margin auto do <dialog>
        // encosta no topo com conteúdo alto.
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        margin: 0,
      }}
    >
      <div className="flex items-start justify-between gap-3 p-5" style={{ borderBottom: "1px solid var(--ds-color-border)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="material-icons shrink-0"
          style={{ color: "var(--ds-color-text-muted)", fontSize: 22, lineHeight: 1 }}
        >
          close
        </button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
    </dialog>
  );
}
