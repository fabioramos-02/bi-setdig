"use client";

import { useState, type KeyboardEvent } from "react";

export type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
};

/**
 * Tabs custom (DS-MS não tem componente de tabs) — ARIA completo, navegação
 * por setas/Home/End. Painéis ficam SEMPRE montados (hidden, não desmontado)
 * pra `window.print()` (ExportPdfButton) exportar todas as abas no PDF, não
 * só a ativa — ver regra @media print em globals.css.
 */
export function Tabs({
  items,
  defaultId,
  ativa: ativaControlada,
  onAtivaChange,
}: {
  items: TabItem[];
  defaultId?: string;
  /** Controlado (opcional) — ex. um card de "Destaques" na aba Visão Geral
   * pulando direto pra outra aba. Sem isso, Tabs gerencia o próprio estado. */
  ativa?: string;
  onAtivaChange?: (id: string) => void;
}) {
  const primeiraHabilitada = items.find((i) => !i.disabled)?.id ?? items[0]?.id;
  const [ativaInterna, setAtivaInterna] = useState(defaultId ?? primeiraHabilitada);
  const ativa = ativaControlada ?? ativaInterna;
  const setAtiva = onAtivaChange ?? setAtivaInterna;

  const habilitadas = items.filter((i) => !i.disabled);

  const focarProxima = (atualId: string, direcao: 1 | -1) => {
    const idx = habilitadas.findIndex((i) => i.id === atualId);
    if (idx === -1) return;
    const proximo = habilitadas[(idx + direcao + habilitadas.length) % habilitadas.length];
    setAtiva(proximo.id);
    document.getElementById(`tab-${proximo.id}`)?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (e.key === "ArrowRight") focarProxima(id, 1);
    else if (e.key === "ArrowLeft") focarProxima(id, -1);
    else if (e.key === "Home") setAtiva(habilitadas[0]?.id);
    else if (e.key === "End") setAtiva(habilitadas[habilitadas.length - 1]?.id);
    else return;
    e.preventDefault();
  };

  return (
    <div>
      <div role="tablist" aria-label="Seções" className="flex gap-2 overflow-x-auto flex-nowrap mb-4 print:hidden">
        {items.map((item) => {
          const isAtiva = ativa === item.id;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={isAtiva}
              aria-controls={`panel-${item.id}`}
              tabIndex={isAtiva ? 0 : -1}
              disabled={item.disabled}
              title={item.disabled ? item.disabledReason : undefined}
              onClick={() => !item.disabled && setAtiva(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className={`ds-button ds-button--sm whitespace-nowrap ${
                item.disabled ? "" : isAtiva ? "ds-button--primary" : "ds-button--ghost"
              }`}
            >
              {item.label}
              {item.disabled && " (em breve)"}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div key={item.id} id={`panel-${item.id}`} role="tabpanel" aria-labelledby={`tab-${item.id}`} hidden={ativa !== item.id}>
          {item.content}
        </div>
      ))}
    </div>
  );
}
