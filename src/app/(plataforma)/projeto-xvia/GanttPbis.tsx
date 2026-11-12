"use client";

import type { RefObject } from "react";
import { GRAVIDADE, ROTULO_SITUACAO, sprintDeInicio, type montarCronograma, type Situacao } from "@/lib/cronograma";
import { fmtNum, linkTfs, quemResolve } from "@/lib/tfs";
import { listaDoCronograma } from "@/lib/cronograma-lista";
import { LinkItem, cinza } from "./comum";
import { COR_SIT, GradeSprints, SetaDegrau, TXT_SIT, corta, useEscalaTexto } from "./GanttComum";

type Crono = ReturnType<typeof montarCronograma>;
const PALETA = ["#0F4B91", "#7c3aed", "#0f766e", "#be185d", "#4d7c0f", "#b45309", "#1d4ed8", "#9f1239"];

/** Detalhe de uma Feature: cadeias de PBIs na linha do tempo (setas em degrau, invertidas em
 * vermelho) e, embaixo, os PBIs sem dependência agrupados por situação — lista, não barras. */
export function GanttPbis({ c, hoje, svgRef }: { c: Crono; hoje: string; svgRef: RefObject<SVGSVGElement | null> }) {
  // Geometria acompanha o tamanho real do texto (fonte maior no navegador): ver useEscalaTexto.
  const k = useEscalaTexto(svgRef);
  const ROT = 420 * k, COL = 124 * k, LIN = 40 * k, CAB = 52 * k, TIT = 32 * k;
  const cadeias = c.blocos.filter((b) => b.cadeia !== null);
  const emCadeia = new Set(cadeias.flatMap((b) => b.pbis.map((p) => p.id)));
  const soltos = c.soltosAbertos.filter((p) => !emCadeia.has(p.id));
  const inv = new Set(c.invertidas.map(([a, b]) => `${a}>${b}`));
  const idx = new Map(c.colunas.map((s, n) => [s.sprint, n]));
  const largura = ROT + COL * (c.colunas.length + (c.aPlanejar ? 1 : 0)) + 12;
  const hojeIdx = c.colunas.findIndex((s) => s.inicio <= hoje && hoje <= s.fim);
  const pos = new Map<number, { x0: number; x1: number; y: number }>();
  let y = CAB;
  const desenho: React.ReactNode[] = [];
  cadeias.forEach((b, nb) => {
    const cor = PALETA[(b.cadeia ?? 0) % PALETA.length];
    desenho.push(<text key={`t${nb}`} x={4} y={y + 24 * k} style={{ fontSize: "var(--ds-body-sm-font-size)" }} fontWeight={600} fill="var(--ds-color-text-primary)">{corta(b.titulo, 64)}</text>);
    y += TIT;
    for (const p of b.pbis) {
      const sit = c.situacao.get(p.id) ?? "sem_sprint";
      const col = idx.get(p.sprint) ?? (c.aPlanejar ? c.colunas.length : -1);
      // Com Start Date, a barra começa na sprint da data (PBI que atravessa várias sprints).
      const colIni = Math.min(col, idx.get(sprintDeInicio(p, c.colunas)) ?? col);
      desenho.push(<rect key={`f${p.id}`} x={0} y={y} width={4} height={LIN - 4 * k} fill={cor} />);
      desenho.push(
        <a key={`l${p.id}`} href={linkTfs(p.id)} target="_blank" rel="noreferrer">
          <text x={10} y={y + 24 * k} style={{ fontSize: "var(--ds-body-sm-font-size)" }} fill="var(--ds-color-text-primary)"><title>{`#${p.id} ${p.titulo} · ${quemResolve(p)}`}</title>#{p.id} {corta(p.titulo, 34)}</text>
        </a>,
      );
      if (col >= 0) {
        const x0 = ROT + colIni * COL + 4;
        const larg = (col - colIni + 1) * COL - 8;
        pos.set(p.id, { x0, x1: x0 + larg, y: y + (LIN - 4 * k) / 2 });
        desenho.push(
          <g key={`b${p.id}`}>
            <rect x={x0} y={y + 2 * k} width={larg} height={LIN - 8 * k} rx={4} fill={COR_SIT[sit]}><title>{`${ROTULO_SITUACAO[sit]} · ${p.coluna ?? p.estado} · ${quemResolve(p)}`}</title></rect>
            <text x={x0 + larg / 2} y={y + 24 * k} style={{ fontSize: "var(--ds-body-sm-font-size)" }} textAnchor="middle" fill={TXT_SIT[sit] ?? "#fff"}>{corta(ROTULO_SITUACAO[sit], 13)}</text>
          </g>,
        );
      }
      y += LIN;
    }
    y += 8 * k;
  });
  const altura = y + 10 * k;
  const porSituacao = GRAVIDADE.filter((s) => s !== "concluido").map((s) => ({ s, ps: soltos.filter((p) => c.situacao.get(p.id) === s) })).filter((g) => g.ps.length);

  return (
    <div className="flex flex-col gap-4">
      {c.invertidas.length > 0 && (
        <div className="text-sm" style={{ color: "var(--ds-color-text-primary)" }}>
          <b>{fmtNum(c.invertidas.length)} {c.invertidas.length === 1 ? "dependência planejada" : "dependências planejadas"} ao contrário</b>: a entrega que precisa vir antes está numa sprint depois. Corrigir a sprint no TFS.
        </div>
      )}
      {cadeias.length > 0 ? (
        <div className="overflow-x-auto min-w-0" tabIndex={0} role="region" aria-label="Dependências: role para ver todas as sprints">
          <svg ref={svgRef} width={largura} height={altura} role="group" aria-label="Cadeias de dependência das entregas" style={{ fontFamily: "inherit", maxWidth: "none", width: largura, height: altura }}>
            <GradeSprints colunas={c.colunas} aPlanejar={c.aPlanejar} rot={ROT} col={COL} altura={altura} hojeIdx={hojeIdx < 0 ? null : hojeIdx} hoje={hoje} k={k} />
            {desenho}
            {c.arestas.map(([a, b]) => {
              const pa = pos.get(a), pb = pos.get(b);
              if (!pa || !pb) return null;
              const invertida = inv.has(`${a}>${b}`);
              return <SetaDegrau key={`${a}>${b}`} x1={pa.x1} y1={pa.y} x2={pb.x0} y2={pb.y} gap={LIN / 2 - 1} invertida={invertida} titulo={invertida ? `#${a} deveria vir antes de #${b}, mas está numa sprint depois` : undefined} />;
            })}
          </svg>
        </div>
      ) : (
        <p className="text-sm" style={cinza}>Nenhuma dependência registrada entre os PBIs desta Feature.</p>
      )}
      {porSituacao.length > 0 && (
        <div>
          <b className="text-sm">PBIs abertos sem dependência ({fmtNum(soltos.length)})</b>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {porSituacao.map(({ s, ps }) => (
              <div key={s} style={{ borderLeft: `4px solid ${COR_SIT[s as Situacao]}`, paddingLeft: 10 }}>
                <div className="text-sm font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>{ROTULO_SITUACAO[s as Situacao]} ({fmtNum(ps.length)})</div>
                <ul className="text-sm flex flex-col gap-0.5 mt-1">
                  {ps.map((p) => <li key={p.id}><LinkItem item={p} /> <span style={cinza}>· {quemResolve(p)}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-semibold">Ver entregas e dependências em lista</summary>
        <p className="mt-2 text-sm" style={cinza}>Nomes completos e ligações cadastradas. O responsável no registro não identifica necessariamente quem deve decidir.</p>
        <ul className="flex flex-col gap-3 mt-3 text-sm">
          {listaDoCronograma(c).map(({ item, situacao, antes, depois }) => <li key={item.id} style={{ borderBottom: "1px solid var(--ds-color-border)", paddingBottom: 8 }}>
            <LinkItem item={item} /><div>{ROTULO_SITUACAO[situacao]} · Responsável no registro: {item.responsavel ?? "Não informado"}</div>
            <div style={cinza}>Sprint: {c.colunas.find((s) => s.sprint === item.sprint)?.nome ?? "Não informada"}</div>
            <div>Depende de: {antes.length ? antes.map((p, n) => <span key={p.id}>{n > 0 && "; "}<LinkItem item={p} /></span>) : "nenhuma entrega cadastrada"}</div>
            <div>Libera: {depois.length ? depois.map((p, n) => <span key={p.id}>{n > 0 && "; "}<LinkItem item={p} /></span>) : "nenhuma entrega cadastrada"}</div>
          </li>)}
        </ul>
      </details>
    </div>
  );
}
