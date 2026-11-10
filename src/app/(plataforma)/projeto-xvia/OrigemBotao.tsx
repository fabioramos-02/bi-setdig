"use client";

import { useState } from "react";
import { Modal } from "@/components/dashboard/Modal";
import { fmtNum, linkTfs, type Origem } from "@/lib/tfs";

const LIMITE = 300;

/** "De onde vem?" — todo indicador do painel aponta o que o compõe: a regra,
 * a fonte (TR, query do TFS) e os itens com link. Se o Secretário questionar
 * um número, o gerente chega ao registro em um clique. */
export function OrigemBotao({ origem }: { origem: Origem }) {
  const [aberto, setAberto] = useState(false);
  const itens = origem.itens ?? [];
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-medium underline print:hidden"
        style={{ color: "var(--ds-color-primary-600)" }}
      >
        De onde vem?
      </button>
      <Modal open={aberto} onClose={() => setAberto(false)} title={origem.rotulo}>
        <p className="text-sm mb-3" style={{ color: "var(--ds-color-text-secondary)" }}>{origem.detalhe}</p>
        {origem.link && (
          <p className="text-sm mb-3">
            <a href={origem.link.href} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>
              {origem.link.texto}
            </a>
          </p>
        )}
        {itens.length > 0 && (
          <>
            <p className="text-xs mb-2" style={{ color: "var(--ds-color-text-muted)" }}>
              {fmtNum(itens.length)} {itens.length === 1 ? "item" : "itens"} no TFS{itens.length > LIMITE ? ` (mostrando ${LIMITE})` : ""}:
            </p>
            <ul className="text-sm flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
              {itens.slice(0, LIMITE).map((i) => (
                <li key={i.id}>
                  <a href={linkTfs(i.id)} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>
                    #{i.id}
                  </a>{" "}
                  {i.titulo}
                  <span style={{ color: "var(--ds-color-text-muted)" }}> · {i.coluna ?? i.estado}{i.epico ? ` · ${i.epico}` : ""}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </>
  );
}
