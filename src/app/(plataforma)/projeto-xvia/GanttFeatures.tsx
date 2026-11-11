"use client";

import type { RefObject } from "react";
import { ROTULO_SITUACAO, type montarPorFeature } from "@/lib/cronograma";
import { COR_SIT, GradeSprints, SetaDegrau, corta, useEscalaTexto } from "./GanttComum";

type Macro = ReturnType<typeof montarPorFeature>;

/** Uma linha por Feature (ou por módulo, na visão geral): barra da primeira à última sprint dos
 * PBIs, com a parte pronta pintada por dentro; a situação com cor e palavra; setas entre
 * Features em degrau (vermelhas se planejadas ao contrário). Clicar abre o detalhe.
 * A geometria acompanha o tamanho real do texto (k): com fonte maior no navegador, o gráfico
 * fica mais largo e alto, e rola dentro da caixa, sem rótulos encavalados. */
export function GanttFeatures({ m, hoje, selecionada, onSelecionar, svgRef }: {
  m: Macro; hoje: string; selecionada: number | null; onSelecionar: (id: number | null) => void; svgRef: RefObject<SVGSVGElement | null>;
}) {
  const k = useEscalaTexto();
  const s = (n: number) => n * k;
  const ROT = s(330), COL = s(84), LIN = s(50), CAB = s(44);
  const aPlanejar = m.linhas.some((l) => l.ini === null && l.aPlanejar > 0);
  const largura = ROT + COL * (m.colunas.length + (aPlanejar ? 1 : 0)) + s(110);
  const altura = CAB + m.linhas.length * LIN + s(14);
  const pos = new Map<number | null, { x0: number; x1: number; y: number }>();

  const linhas = m.linhas.map((l, n) => {
    const y = CAB + n * LIN;
    const sel = selecionada !== null && l.id === selecionada;
    const cor = l.situacao === "vazio" ? "#9aa3ad" : COR_SIT[l.situacao];
    const ini = l.ini ?? (l.aPlanejar ? m.colunas.length : null);
    const fim = l.fim ?? ini;
    let barra = null;
    if (ini !== null && fim !== null) {
      const x0 = ROT + ini * COL + 4;
      const w = (fim - ini + 1) * COL - 8;
      const feito = l.total ? (w * l.prontos) / l.total : 0;
      pos.set(l.id, { x0, x1: x0 + Math.max(w - 10, w / 2), y: y + s(22) });
      barra = (
        <g>
          <rect x={x0} y={y + s(12)} width={w} height={s(20)} rx={5} fill={cor} fillOpacity={0.18} stroke={cor} strokeWidth={1.5} />
          {feito > 0 && <rect x={x0} y={y + s(12)} width={feito} height={s(20)} rx={5} fill={COR_SIT.concluido} />}
          <text x={x0 + w + 6} y={y + s(26)} fontSize={11} fontWeight={600} fill="var(--ds-color-text-primary)">
            {l.prontos}/{l.total}{l.ini !== null && l.aPlanejar ? ` · +${l.aPlanejar} a planejar` : ""}
          </text>
        </g>
      );
    }
    const ativar = () => onSelecionar(sel ? null : l.id);
    return (
      <g key={String(l.id)} role="button" tabIndex={0} aria-pressed={sel} aria-label={`${l.titulo}: ${l.prontos} de ${l.total} prontas, ${l.situacao === "vazio" ? "sem PBIs" : ROTULO_SITUACAO[l.situacao]}`}
        onClick={ativar} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), ativar())} style={{ cursor: "pointer", outline: "none" }}>
        <rect x={0} y={y} width={largura} height={LIN} fill={sel ? "color-mix(in srgb, var(--ds-color-primary-600) 10%, transparent)" : "transparent"} />
        <rect x={0} y={y + s(6)} width={4} height={LIN - s(12)} rx={2} fill={cor} />
        <text x={12} y={y + s(20)} fontSize={13} fontWeight={600} fill="var(--ds-color-text-primary)">
          <title>{l.titulo}</title>{corta(l.titulo, 40)}
        </text>
        <text x={12} y={y + s(38)} fontSize={11}>
          <tspan fill="var(--ds-color-text-muted)">{l.frente} · </tspan>
          <tspan fill={cor} fontWeight={600}>{l.situacao === "vazio" ? "sem PBIs" : ROTULO_SITUACAO[l.situacao]}</tspan>
          {l.id !== null && <tspan fill="var(--ds-color-text-muted)"> · #{l.id}</tspan>}
        </text>
        {barra}
        <line x1={0} x2={largura} y1={y + LIN} y2={y + LIN} stroke="var(--ds-color-border)" />
      </g>
    );
  });

  return (
    <div className="overflow-x-auto min-w-0">
      <svg ref={svgRef} width={largura} height={altura} role="group" aria-label="Cronograma por Feature" style={{ fontFamily: "inherit" }}>
        <GradeSprints colunas={m.colunas} aPlanejar={aPlanejar} rot={ROT} col={COL} altura={altura} hojeIdx={m.hojeIdx} hoje={hoje} k={k} />
        {linhas}
        {m.ligacoes.map((g, n) => {
          const a = pos.get(g.de), b = pos.get(g.para);
          if (!a || !b) return null;
          // Setas que saem de barras terminando na mesma sprint não se sobrepõem na vertical.
          return (
            <SetaDegrau key={`${g.de}>${g.para}`} deBaixo x1={a.x1 - (n % 3) * 7} y1={a.y + s(10)} x2={b.x0} y2={b.y} gap={LIN / 2 - 2} invertida={g.invertida}
              titulo={`${g.pares.length} ${g.pares.length === 1 ? "dependência" : "dependências"} entre PBIs${g.invertida ? " — alguma planejada ao contrário" : ""}`} />
          );
        })}
      </svg>
    </div>
  );
}
