"use client";

import type { RefObject } from "react";
import { exportarPng, exportarSvg } from "@/lib/exportar-svg";

/** Botões "Baixar PNG" e "Baixar SVG" de um gráfico em SVG. `titulo` vai dentro da imagem. */
export function BaixarImagem({ alvo, nome, titulo }: { alvo: RefObject<SVGSVGElement | null>; nome: string; titulo: string }) {
  const baixar = (tipo: "png" | "svg") => {
    if (!alvo.current) return;
    if (tipo === "svg") exportarSvg(alvo.current, nome, titulo);
    else void exportarPng(alvo.current, nome, titulo);
  };
  return (
    <span className="flex gap-3 print:hidden">
      {(["png", "svg"] as const).map((t) => (
        <button key={t} type="button" onClick={() => baixar(t)} className="bi-body font-medium inline-flex items-center gap-1" style={{ color: "var(--ds-color-primary-600)" }}>
          <span aria-hidden className="material-icons" style={{ fontSize: 18 }}>download</span>Baixar {t.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

/** "Cronograma: CMS" -> "cronograma-cms-2026-11-11". */
export const nomeArquivo = (base: string, hoje: string) =>
  `${base.normalize("NFD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${hoje}`;
