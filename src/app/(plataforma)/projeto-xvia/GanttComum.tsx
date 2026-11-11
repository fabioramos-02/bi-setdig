"use client";

import { useSyncExternalStore } from "react";
import type { Situacao } from "@/lib/cronograma";
import { ROTULO_SITUACAO } from "@/lib/cronograma";
import { fmtData, type TfsSprint } from "@/lib/tfs";

/** Quanto o navegador aumentou o texto do SVG (tamanho mínimo de fonte, zoom de texto do Chrome
 * ou do Windows). A grade do Gantt é em px; sem acompanhar, os rótulos se atropelam (print do
 * Fabio, 11/11/2026). Mede o mesmo texto a 11px e a 40px (acima de qualquer mínimo): sem ajuste do
 * navegador, a razão é 1. Devolve k entre 1 e 2,5 para multiplicar a geometria. */
let escalaMedida: number | null = null;
function medirEscala(): number {
  if (escalaMedida !== null) return escalaMedida;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("style", "position:absolute;left:-9999px;top:0;visibility:hidden");
  const mede = (tam: number) => {
    const t = document.createElementNS(ns, "text");
    t.setAttribute("font-size", String(tam));
    t.textContent = "Sprint 10 27/07–14/08";
    svg.appendChild(t);
    return t;
  };
  const pequeno = mede(11), grande = mede(40);
  document.body.appendChild(svg);
  const real = pequeno.getComputedTextLength(), esperado = (grande.getComputedTextLength() * 11) / 40;
  svg.remove();
  escalaMedida = esperado > 0 ? Math.min(2.5, Math.max(1, Math.round((real / esperado) * 100) / 100)) : 1;
  return escalaMedida;
}
const semAssinatura = () => () => {};

export function useEscalaTexto() {
  // Servidor = 1; no navegador, mede uma vez (a configuração de fonte não muda com a página aberta).
  return useSyncExternalStore(semAssinatura, medirEscala, () => 1);
}

/** Cores das situações do cronograma — fixas (não variam com o tema) para a imagem exportada
 * sair igual à tela. Texto escuro nas cores claras. */
export const COR_SIT: Record<Situacao, string> = {
  concluido: "#0F4B91", atrasado: "#d97706", esperando: "#7c3aed", nao_iniciado: "#5b6573",
  risco: "#f0b429", andamento: "#3b7dd8", futuro: "#9bb9d8", sem_sprint: "#9aa3ad",
};
export const TXT_SIT: Partial<Record<Situacao, string>> = { risco: "#243447", futuro: "#18324d" };
export const COR_INVERTIDA = "#dc2626";
export const corta = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Cabeçalho de sprints, faixas alternadas e a linha HOJE. */
export function GradeSprints({ colunas, aPlanejar, rot, col, altura, hojeIdx, hoje, k = 1 }: {
  colunas: TfsSprint[]; aPlanejar: boolean; rot: number; col: number; altura: number; hojeIdx: number | null; hoje: string; k?: number;
}) {
  // Com texto muito aumentado, a data sai do cabeçalho (fica no tooltip) para não atropelar.
  const comData = k <= 1.2;
  const s = hojeIdx === null ? null : colunas[hojeIdx];
  const xHoje = s ? rot + hojeIdx! * col + col * Math.min(1, (Date.parse(hoje) - Date.parse(s.inicio)) / Math.max(1, Date.parse(s.fim) - Date.parse(s.inicio))) : null;
  return (
    <>
      <defs>
        <marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ds-color-text-secondary)" /></marker>
        <marker id="seta-inv" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={COR_INVERTIDA} /></marker>
      </defs>
      {colunas.map((c, n) => (
        <g key={c.sprint}>
          <rect x={rot + n * col} y={0} width={col} height={altura} fill={n % 2 ? "var(--ds-color-background-muted)" : "transparent"} />
          <text x={rot + n * col + col / 2} y={16 * k} fontSize={11} fontWeight={600} textAnchor="middle" fill="var(--ds-color-text-primary)">
            <title>{`${c.nome}: ${fmtData(c.inicio)} a ${fmtData(c.fim)}`}</title>{c.nome}
          </text>
          {comData && <text x={rot + n * col + col / 2} y={32 * k} fontSize={10} textAnchor="middle" fill="var(--ds-color-text-muted)">{fmtData(c.inicio).slice(0, 5)}–{fmtData(c.fim).slice(0, 5)}</text>}
        </g>
      ))}
      {aPlanejar && <text x={rot + colunas.length * col + col / 2} y={16 * k} fontSize={11} fontWeight={600} textAnchor="middle" fill="var(--ds-color-text-muted)">A planejar</text>}
      {xHoje !== null && (
        <>
          <line x1={xHoje} x2={xHoje} y1={(comData ? 36 : 22) * k} y2={altura} stroke="var(--ds-color-danger)" strokeDasharray="4 3" />
          <text x={xHoje + 3} y={altura - 4} fontSize={10} fill="var(--ds-color-danger)">HOJE</text>
        </>
      )}
    </>
  );
}

/** Seta em degrau (horizontal → vertical → horizontal): não cruza o gráfico em curva. Sai da
 * direita da barra de origem e entra pela esquerda da barra de destino, mesmo se o destino
 * estiver antes (dependência invertida). */
export function SetaDegrau({ x1, y1, x2, y2, gap, invertida, titulo, deBaixo }: {
  x1: number; y1: number; x2: number; y2: number; gap: number; invertida?: boolean; titulo?: string;
  /** Sai pela base da barra (x1, y1 = canto de baixo), sem cruzar o texto ao lado dela. */
  deBaixo?: boolean;
}) {
  const meioY = y2 + (y2 > y1 ? -gap : gap);
  const d = deBaixo ? `M${x1},${y1} V${meioY} H${x2 - 10} V${y2} H${x2}` : `M${x1},${y1} h8 V${meioY} H${x2 - 10} V${y2} H${x2}`;
  return (
    <path d={d} fill="none" stroke={invertida ? COR_INVERTIDA : "var(--ds-color-text-secondary)"} strokeWidth={invertida ? 1.6 : 1.2}
      strokeDasharray={invertida ? "5 3" : undefined} markerEnd={`url(#${invertida ? "seta-inv" : "seta"})`}>
      {titulo && <title>{titulo}</title>}
    </path>
  );
}

export function Legenda({ situacoes }: { situacoes: Situacao[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legenda" style={{ color: "var(--ds-color-text-secondary)" }}>
      {situacoes.map((s) => (
        <li key={s} className="flex items-center gap-1.5"><span aria-hidden style={{ width: 12, height: 12, background: COR_SIT[s], borderRadius: 2, display: "inline-block" }} />{ROTULO_SITUACAO[s]}</li>
      ))}
      <li className="flex items-center gap-1.5"><span aria-hidden style={{ width: 16, borderTop: `2px dashed ${COR_INVERTIDA}`, display: "inline-block" }} />Dependência planejada ao contrário</li>
    </ul>
  );
}
