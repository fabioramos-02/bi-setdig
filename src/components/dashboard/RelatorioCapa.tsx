"use client";

import { formatarExtracao } from "@/lib/relatorio";

/** Cabeçalho institucional que aparece SÓ no PDF (hidden na tela, block no
 * print). Dá identidade ao relatório: brasão do Estado, órgão, título, o
 * recorte (filtro) e a data/hora de extração. Fica no topo do <main> de cada
 * domínio que exporta — vale inclusive pra Ctrl+P manual. */
export function RelatorioCapa({ titulo, filtro }: { titulo: string; filtro: string }) {
  return (
    <div className="hidden print:block mb-6">
      <div className="flex items-center gap-4 pb-4" style={{ borderBottom: "2px solid var(--ds-color-primary-600)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/brasao-ms.svg" alt="Brasão do Estado de Mato Grosso do Sul" style={{ height: 56, width: "auto" }} />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ds-color-text-primary)" }}>
            Governo do Estado de Mato Grosso do Sul
          </p>
          <p className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
            Secretaria-Executiva de Transformação Digital — SETDIG
          </p>
        </div>
      </div>

      <h1 className="text-3xl font-bold pt-8 pb-2" style={{ color: "var(--ds-color-text-primary)" }}>
        {titulo}
      </h1>

      <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
        <strong>Extraído em:</strong> {formatarExtracao(new Date())}
      </p>
    </div>
  );
}
