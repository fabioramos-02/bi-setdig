"use client";

import { useRef, useState } from "react";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { Select } from "@/components/dashboard/Select";
import { montarCronograma, ROTULO_SITUACAO, type Situacao } from "@/lib/cronograma";
import { fmtData, fmtNum, linkTfs, type TfsItem, type TfsSprint } from "@/lib/tfs";
import { exportarPng, exportarSvg } from "@/lib/exportar-svg";
import { LinkItem, cinza } from "./comum";

const COR_SIT: Record<Situacao, string> = {
  concluido: "#0F4B91", atrasado: "#d97706", risco: "#f0b429", andamento: "#3b7dd8", futuro: "#9bb9d8", sem_sprint: "#9aa3ad",
};
const TXT_SIT: Partial<Record<Situacao, string>> = { risco: "#243447", futuro: "#18324d" };
const PALETA = ["#0F4B91", "#7c3aed", "#0f766e", "#be185d", "#4d7c0f", "#b45309", "#1d4ed8", "#9f1239"];
const ROT = 300, COL = 88, LIN = 30, CAB = 44, TIT = 28;
const corta = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Nível 2 — Cronograma executivo de entregas e dependências (PBI #1348598): onde cada
 * módulo está, o que atrasou e o que isso trava. Barra = PBI na sprint dele; seta =
 * Predecessor → Sucessor. Na visão geral só aparecem as cadeias, para caber na tela. */
export function CronogramaTab({ itens, sprints, hoje, modulo }: { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string; modulo: string }) {
  const epicos = [...new Map(itens.filter((i) => i.epicoId && i.epico).map((i) => [i.epicoId!, i.epico!])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const doFiltro = epicos.find(([, nome]) => nome === modulo)?.[0];
  const [escolha, setEscolha] = useState<string>("");
  const epicoId = escolha ? Number(escolha) : doFiltro ?? null;
  const c = montarCronograma(itens, sprints, epicoId, hoje);
  const blocos = epicoId === null ? c.blocos.filter((b) => b.cadeia !== null) : c.blocos;
  const svgRef = useRef<SVGSVGElement>(null);
  const tituloGrafico = epicoId === null ? "Cadeias de dependência de todos os módulos" : `Cronograma: ${epicos.find(([id]) => id === epicoId)?.[1] ?? ""}`;
  // Arquivo: "cronograma-cms-2026-11-11.svg" — o título vai dentro da imagem, com a data do retrato.
  const nomeArquivo = `cronograma-${(epicoId === null ? "geral" : epicos.find(([id]) => id === epicoId)?.[1] ?? "modulo").normalize("NFD").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${hoje}`;
  const exportar = (tipo: "svg" | "png") => {
    if (!svgRef.current) return;
    const titulo = `${tituloGrafico} · TFS de ${fmtData(hoje)}`;
    if (tipo === "svg") exportarSvg(svgRef.current, nomeArquivo, titulo);
    else void exportarPng(svgRef.current, nomeArquivo, titulo);
  };

  const idx = new Map(c.colunas.map((s, n) => [s.sprint, n]));
  const nCols = c.colunas.length + (c.aPlanejar ? 1 : 0);
  const largura = ROT + COL * nCols + 12;
  const pos = new Map<number, { x0: number; x1: number; y: number }>();
  let y = CAB;
  const linhas: React.ReactNode[] = [];
  blocos.forEach((b, nb) => {
    const cor = b.cadeia === null ? "#9aa3ad" : PALETA[b.cadeia % PALETA.length];
    linhas.push(<text key={`t${nb}`} x={4} y={y + 18} fontSize={12} fontWeight={600} fill={cor}>{corta(b.titulo, 70)}</text>);
    y += TIT;
    for (const p of b.pbis) {
      const sit = c.situacao.get(p.id) ?? "sem_sprint";
      const col = idx.get(p.sprint) ?? (c.aPlanejar ? c.colunas.length : -1);
      linhas.push(<rect key={`f${p.id}`} x={0} y={y} width={4} height={LIN - 4} fill={cor} />);
      linhas.push(
        <a key={`l${p.id}`} href={linkTfs(p.id)} target="_blank" rel="noreferrer">
          <text x={10} y={y + 17} fontSize={12} fill="var(--ds-color-text-primary)"><title>{`#${p.id} ${p.titulo}`}</title>#{p.id} {corta(p.titulo, 38)}</text>
        </a>,
      );
      if (col >= 0) {
        const x0 = ROT + col * COL + 4;
        pos.set(p.id, { x0, x1: x0 + COL - 8, y: y + (LIN - 4) / 2 });
        linhas.push(
          <g key={`b${p.id}`}>
            <rect x={x0} y={y + 2} width={COL - 8} height={LIN - 8} rx={4} fill={COR_SIT[sit]}><title>{`${ROTULO_SITUACAO[sit]} · ${p.responsavel ?? "sem responsável"}`}</title></rect>
            <text x={x0 + (COL - 8) / 2} y={y + 17} fontSize={10} textAnchor="middle" fill={TXT_SIT[sit] ?? "#fff"}>{ROTULO_SITUACAO[sit]}</text>
          </g>,
        );
      }
      y += LIN;
    }
    y += 8;
  });
  const altura = y + 8;
  // Linha HOJE: posição proporcional dentro da sprint corrente.
  const atual = c.colunas.findIndex((s) => s.inicio <= hoje && hoje <= s.fim);
  const xHoje = atual < 0 ? null : ROT + atual * COL + COL * Math.min(1, (Date.parse(hoje) - Date.parse(c.colunas[atual].inicio)) / Math.max(1, Date.parse(c.colunas[atual].fim) - Date.parse(c.colunas[atual].inicio)));

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={c.frase}
        caption={`${fmtNum(c.contagem.ligacoes)} dependências registradas no recorte.${c.legado.length ? ` ${fmtNum(c.legado.length)} pendências antigas da SGD ficam à parte, fora da conta de atraso.` : ""}`}
        comoLer="Cada barra é uma entrega (PBI) na sprint em que está planejada; a cor diz a situação. A seta liga a entrega que precisa terminar antes (predecessora) à que depende dela. Em risco = depende de algo atrasado ou planejado para a mesma sprint. Só entra dependência registrada no TFS como Predecessor/Sucessor."
      />
      <div className="max-w-md">
        <Select label="Módulo" value={escolha || (doFiltro ? String(doFiltro) : "")} onChange={setEscolha} todosLabel="Visão geral (só cadeias)" maxWidth={9999}
          opcoes={epicos.map(([id, nome]) => ({ value: String(id), label: nome }))} />
      </div>
      <DashboardSection
        title={tituloGrafico}
        action={blocos.length > 0 ? (
          <span className="flex gap-3 print:hidden">
            {(["png", "svg"] as const).map((t) => (
              <button key={t} type="button" onClick={() => exportar(t)} className="text-sm font-medium inline-flex items-center gap-1" style={{ color: "var(--ds-color-primary-600)" }}>
                <span aria-hidden className="material-icons" style={{ fontSize: 18 }}>download</span>Baixar {t.toUpperCase()}
              </button>
            ))}
          </span>
        ) : undefined}
      >
        {blocos.length === 0 ? (
          <p className="text-sm" style={cinza}>Nenhuma {epicoId === null ? "dependência registrada entre entregas" : "entrega aberta"} neste recorte.</p>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <svg ref={svgRef} width={largura} height={altura} role="img" aria-label="Cronograma por sprint com dependências" style={{ fontFamily: "inherit" }}>
              <defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ds-color-text-secondary)" /></marker></defs>
              {c.colunas.map((s, n) => (
                <g key={s.sprint}>
                  <rect x={ROT + n * COL} y={0} width={COL} height={altura} fill={n % 2 ? "var(--ds-color-background-muted)" : "transparent"} />
                  <text x={ROT + n * COL + COL / 2} y={16} fontSize={11} fontWeight={600} textAnchor="middle" fill="var(--ds-color-text-primary)">{s.nome}</text>
                  <text x={ROT + n * COL + COL / 2} y={32} fontSize={10} textAnchor="middle" fill="var(--ds-color-text-muted)">{fmtData(s.inicio).slice(0, 5)}–{fmtData(s.fim).slice(0, 5)}</text>
                </g>
              ))}
              {c.aPlanejar && <text x={ROT + c.colunas.length * COL + COL / 2} y={16} fontSize={11} fontWeight={600} textAnchor="middle" fill="var(--ds-color-text-muted)">A planejar</text>}
              {xHoje !== null && <><line x1={xHoje} x2={xHoje} y1={36} y2={altura} stroke="var(--ds-color-danger)" strokeDasharray="4 3" /><text x={xHoje + 3} y={altura - 4} fontSize={10} fill="var(--ds-color-danger)">HOJE</text></>}
              {linhas}
              {c.arestas.map(([a, b]) => {
                const pa = pos.get(a), pb = pos.get(b);
                if (!pa || !pb) return null;
                const meio = (pa.x1 + pb.x0) / 2;
                return <path key={`${a}>${b}`} d={`M${pa.x1},${pa.y} C${Math.max(meio, pa.x1 + 12)},${pa.y} ${Math.min(meio, pb.x0 - 12)},${pb.y} ${pb.x0},${pb.y}`} fill="none" stroke="var(--ds-color-text-secondary)" strokeWidth={1.2} markerEnd="url(#seta)" />;
              })}
            </svg>
          </div>
        )}
        <ul className="mt-3 flex flex-wrap gap-3 text-xs" aria-label="Legenda">
          {(Object.keys(COR_SIT) as Situacao[]).map((s) => <li key={s} className="flex items-center gap-1"><span style={{ width: 12, height: 12, background: COR_SIT[s], borderRadius: 2, display: "inline-block" }} />{ROTULO_SITUACAO[s]}</li>)}
        </ul>
      </DashboardSection>
      {(c.semSprint.length > 0 || c.legado.length > 0) && (
        <DashboardSection title="Fora do gráfico">
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div><b>Sem sprint e sem dependência ({fmtNum(c.semSprint.length)})</b><ul className="mt-1 flex flex-col gap-1">{c.semSprint.slice(0, 15).map((p) => <li key={p.id}><LinkItem item={p} /></li>)}</ul></div>
            <div><b>Pendências antigas da SGD ({fmtNum(c.legado.length)})</b><p style={cinza}>Sprint encerrada, sem dependência: não contam como atraso da X-VIA.</p><ul className="mt-1 flex flex-col gap-1">{c.legado.slice(0, 15).map((p) => <li key={p.id}><LinkItem item={p} /></li>)}</ul></div>
          </div>
        </DashboardSection>
      )}
    </div>
  );
}
