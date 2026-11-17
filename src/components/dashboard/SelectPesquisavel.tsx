"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { filtrarOrdenarLinhas } from "@/lib/table-view";
import type { OpcaoSelect } from "./Select";

/** Select com pesquisa: fechado, parece e funciona como o `Select` do DS
 * (rótulo + caixa com o valor). Aberto, mostra um campo de busca acima da
 * lista. Teclado: setas navegam, Enter escolhe, Esc fecha. */
export function SelectPesquisavel({
  label,
  value,
  onChange,
  opcoes,
  placeholder,
  maxWidth = 260,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  opcoes: OpcaoSelect[];
  placeholder: string;
  maxWidth?: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();

  const filtradas = filtrarOrdenarLinhas(opcoes, busca, (o) => o.label);
  const selecionada = opcoes.find((o) => o.value === value);

  const abrir = () => {
    setBusca("");
    setAtivo(Math.max(0, opcoes.findIndex((o) => o.value === value)));
    setAberto(true);
  };
  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  };
  const escolher = (o: OpcaoSelect) => {
    onChange(o.value);
    fechar();
  };

  useEffect(() => {
    if (!aberto) return;
    campo.current?.focus();
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-indice="${ativo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativo, aberto]);

  const teclado = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") setAtivo((i) => Math.min(i + 1, filtradas.length - 1));
    else if (e.key === "ArrowUp") setAtivo((i) => Math.max(i - 1, 0));
    else if (e.key === "Enter" && filtradas[ativo]) escolher(filtradas[ativo]);
    else if (e.key === "Escape") fechar();
    else if (e.key === "Tab") setAberto(false);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={raiz} className="ds-field relative" style={{ maxWidth, width: "100%" }}>
      <span className="ds-field__label" id={`${id}-rotulo`}>{label}</span>
      <button
        ref={botao}
        type="button"
        className="ds-select text-left"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-labelledby={`${id}-rotulo ${id}-valor`}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            abrir();
          }
        }}
      >
        <span id={`${id}-valor`} style={{ color: selecionada ? undefined : "var(--ds-color-text-muted)" }}>
          {selecionada?.label ?? placeholder}
        </span>
      </button>

      {aberto && (
        <div
          className="absolute left-0 right-0 z-30 mt-1 flex flex-col"
          style={{
            top: "100%",
            background: "var(--ds-color-background)",
            border: "1px solid var(--ds-color-border)",
            borderRadius: "var(--ds-radius-md)",
            boxShadow: "var(--ds-shadow-card-md)",
          }}
        >
          <div className="p-2" style={{ borderBottom: "1px solid var(--ds-color-border)" }}>
            <input
              ref={campo}
              type="search"
              className="ds-input w-full"
              placeholder="Pesquisar"
              aria-label={`Pesquisar ${label.toLocaleLowerCase("pt-BR")}`}
              role="combobox"
              aria-expanded
              aria-controls={`${id}-lista`}
              aria-activedescendant={filtradas[ativo] ? `${id}-op-${ativo}` : undefined}
              aria-autocomplete="list"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setAtivo(0);
              }}
              onKeyDown={teclado}
            />
          </div>
          <ul ref={lista} id={`${id}-lista`} role="listbox" aria-labelledby={`${id}-rotulo`} className="max-h-64 overflow-y-auto py-1">
            {filtradas.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-op-${i}`}
                data-indice={i}
                role="option"
                aria-selected={o.value === value}
                className="bi-body-small px-3 py-2 cursor-pointer"
                style={{
                  background: i === ativo ? "var(--ds-color-background-muted)" : undefined,
                  color: "var(--ds-color-text-primary)",
                  fontWeight: o.value === value ? 600 : undefined,
                }}
                onMouseEnter={() => setAtivo(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(o)}
              >
                {o.label}
              </li>
            ))}
            {filtradas.length === 0 && (
              <li className="bi-body-small px-3 py-2" style={{ color: "var(--ds-color-text-muted)" }}>
                Nenhum resultado para &quot;{busca}&quot;.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
