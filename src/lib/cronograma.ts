/**
 * Cronograma executivo de entregas e dependências (PBI #1348598) — porte da lógica de
 * lancar-demandas-xvia/src/cronograma.py. Uma barra por PBI na sprint dele, cadeias de
 * dependência (só links Predecessor/Successor; Related não conta) e a situação de cada um.
 * Funções puras; o desenho fica em projeto-xvia/CronogramaTab.tsx.
 */
import type { TfsItem, TfsSprint } from "./tfs.ts";

export type Situacao = "concluido" | "atrasado" | "risco" | "andamento" | "futuro" | "sem_sprint";
export const ROTULO_SITUACAO: Record<Situacao, string> = {
  concluido: "Concluído", atrasado: "Atrasado", risco: "Em risco",
  andamento: "Em andamento", futuro: "Futuro", sem_sprint: "Sem sprint",
};
export type Aresta = [predecessor: number, sucessor: number];

const PBI = "Product Backlog Item";

/** PBIs (não removidos) do épico; sem épico = todos. */
export const pbisDoEpico = (itens: TfsItem[], epicoId: number | null) =>
  itens.filter((i) => i.tipo === PBI && i.estado !== "Removed" && (epicoId === null || i.epicoId === epicoId));

/** Ligações Predecessor → Sucessor só entre os PBIs do recorte (dependência externa some). */
export function arestas(pbis: TfsItem[]): Aresta[] {
  const ids = new Set(pbis.map((p) => p.id));
  const saida = new Map<string, Aresta>();
  for (const p of pbis) {
    for (const a of p.dependeDe ?? []) if (ids.has(a)) saida.set(`${a}>${p.id}`, [a, p.id]);
    for (const b of p.trava ?? []) if (ids.has(b)) saida.set(`${p.id}>${b}`, [p.id, b]);
  }
  return [...saida.values()];
}

/** Componentes conexos: cadeias com 2+ PBIs e os soltos. */
export function cadeias(ids: number[], ars: Aresta[]): { grupos: number[][]; soltos: number[] } {
  const viz = new Map<number, Set<number>>();
  const liga = (a: number, b: number) => viz.set(a, (viz.get(a) ?? new Set()).add(b));
  for (const [a, b] of ars) { liga(a, b); liga(b, a); }
  const visto = new Set<number>();
  const grupos: number[][] = [];
  const soltos: number[] = [];
  for (const i of [...ids].sort((a, b) => a - b)) {
    if (visto.has(i)) continue;
    const comp = new Set<number>();
    const pilha = [i];
    while (pilha.length) {
      const x = pilha.pop()!;
      if (comp.has(x)) continue;
      comp.add(x);
      for (const y of viz.get(x) ?? []) if (!comp.has(y)) pilha.push(y);
    }
    comp.forEach((x) => visto.add(x));
    if (comp.size > 1) grupos.push([...comp].sort((a, b) => a - b));
    else soltos.push(i);
  }
  return { grupos, soltos };
}

/** Situação pela sprint e por hoje. Risco = não está pronto e algum predecessor está atrasado,
 * sem sprint, ou numa sprint igual ou posterior (não dá tempo de terminar antes). */
export function situacoes(pbis: TfsItem[], sprints: TfsSprint[], ars: Aresta[], hoje: string): Map<number, Situacao> {
  const sp = new Map(sprints.map((s) => [s.sprint, s]));
  const base = new Map<number, Situacao>();
  for (const p of pbis) {
    const s = sp.get(p.sprint);
    base.set(p.id, p.estado === "Done" ? "concluido" : !s ? "sem_sprint" : s.fim < hoje ? "atrasado" : s.inicio <= hoje ? "andamento" : "futuro");
  }
  const final = new Map(base);
  const porId = new Map(pbis.map((p) => [p.id, p]));
  for (const [a, b] of ars) {
    const sb0 = base.get(b);
    if ((sb0 !== "andamento" && sb0 !== "futuro") || base.get(a) === "concluido") continue;
    const sa = sp.get(porId.get(a)?.sprint ?? "");
    const sb = sp.get(porId.get(b)?.sprint ?? "");
    if (base.get(a) === "atrasado" || base.get(a) === "sem_sprint" || (sa && sb && sa.inicio >= sb.inicio)) final.set(b, "risco");
  }
  return final;
}

/** PBIs [SGD] antigos: sprint encerrada, abertos e fora de cadeia. Ficam num bloco à parte
 * para não contar como atraso da X-VIA. */
export function legadoSgd(pbis: TfsItem[], sprints: TfsSprint[], ars: Aresta[], hoje: string): Set<number> {
  const sp = new Map(sprints.map((s) => [s.sprint, s]));
  const ligados = new Set(ars.flat());
  return new Set(pbis.filter((p) => {
    const s = sp.get(p.sprint);
    return p.frente === "SGD" && p.estado !== "Done" && !ligados.has(p.id) && !!s && s.fim < hoje;
  }).map((p) => p.id));
}

/** Profundidade na cadeia (0 = não depende de ninguém). Ciclo não trava: volta 0. */
export function niveis(ars: Aresta[]): Map<number, number> {
  const preds = new Map<number, number[]>();
  for (const [a, b] of ars) preds.set(b, [...(preds.get(b) ?? []), a]);
  const memo = new Map<number, number>();
  const nivel = (i: number, pilha: Set<number>): number => {
    if (memo.has(i)) return memo.get(i)!;
    if (pilha.has(i)) return 0;
    const n = Math.max(-1, ...(preds.get(i) ?? []).map((a) => nivel(a, new Set(pilha).add(i)))) + 1;
    memo.set(i, n);
    return n;
  };
  for (const x of new Set(ars.flat())) nivel(x, new Set());
  return memo;
}

export type Bloco = { titulo: string; cadeia: number | null; pbis: TfsItem[] };

/** Monta o cronograma de um recorte: blocos (cadeias e soltos abertos), colunas de sprint,
 * situação de cada PBI e a frase-âncora. */
export function montarCronograma(itens: TfsItem[], sprints: TfsSprint[], epicoId: number | null, hoje: string) {
  const todos = pbisDoEpico(itens, epicoId);
  const ordenadas = [...sprints].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const todasArestas = arestas(todos);
  const legadoIds = legadoSgd(todos, ordenadas, todasArestas, hoje);
  const pbis = todos.filter((p) => !legadoIds.has(p.id));
  const ars = todasArestas.filter(([a, b]) => !legadoIds.has(a) && !legadoIds.has(b));
  const sit = situacoes(pbis, ordenadas, ars, hoje);
  const porId = new Map(pbis.map((p) => [p.id, p]));
  const sp = new Map(ordenadas.map((s) => [s.sprint, s]));
  const ordem = (p: TfsItem) => sp.get(p.sprint)?.inicio ?? "9999";
  const { grupos, soltos } = cadeias(pbis.map((p) => p.id), ars);
  const nv = niveis(ars);
  const destino = (g: number[]) => {
    const fins = g.filter((i) => !ars.some(([a]) => a === i));
    return (fins.length ? fins : g).map((i) => porId.get(i)!).sort((a, b) => ordem(b).localeCompare(ordem(a)))[0].titulo;
  };
  const blocos: Bloco[] = grupos.map((g, n) => ({
    titulo: `Cadeia ${n + 1} · leva a: ${destino(g)}`,
    cadeia: n,
    pbis: g.map((i) => porId.get(i)!).sort((a, b) => (nv.get(a.id) ?? 0) - (nv.get(b.id) ?? 0) || ordem(a).localeCompare(ordem(b)) || a.id - b.id),
  }));
  const abertosSoltos = soltos.map((i) => porId.get(i)!).filter((p) => !["concluido", "sem_sprint"].includes(sit.get(p.id)!))
    .sort((a, b) => ordem(a).localeCompare(ordem(b)) || a.id - b.id);
  if (abertosSoltos.length) blocos.push({ titulo: "Sem dependência registrada", cadeia: null, pbis: abertosSoltos });

  // Colunas: da primeira sprint desenhada até duas depois de hoje.
  const desenhados = blocos.flatMap((b) => b.pbis);
  const usadas = desenhados.map((p) => sp.get(p.sprint)).filter((s): s is TfsSprint => !!s);
  const adiante = ordenadas.filter((s) => s.fim >= hoje).slice(0, 2);
  const ini = [...usadas.map((s) => s.inicio), hoje].sort()[0];
  const fim = [...usadas, ...adiante].map((s) => s.fim).concat(hoje).sort().at(-1)!;
  const colunas = ordenadas.filter((s) => s.fim >= ini && s.inicio <= fim);
  const aPlanejar = desenhados.some((p) => sit.get(p.id) === "sem_sprint");

  const contagem = (s: Situacao) => pbis.filter((p) => sit.get(p.id) === s).length;
  const prox = ordenadas.find((s) => s.inicio > hoje);
  const partes = [`${contagem("concluido")} de ${pbis.length} entregas estão prontas.`];
  partes.push(contagem("atrasado") ? `${contagem("atrasado")} passaram da sprint prevista.` : "Nenhuma entrega passou da sprint prevista.");
  if (contagem("risco")) partes.push(`${contagem("risco")} estão em risco: dependem de algo atrasado ou planejado para a mesma sprint.`);
  const proxima = prox ? { nome: prox.nome, previstas: pbis.filter((p) => p.sprint === prox.sprint && sit.get(p.id) !== "concluido").length } : null;
  if (proxima) partes.push(proxima.previstas ? `Na ${proxima.nome} estão previstas ${proxima.previstas}.` : `Nenhuma entrega planejada ainda para a ${proxima.nome}.`);

  return {
    blocos,
    arestas: ars,
    situacao: sit,
    colunas,
    aPlanejar,
    semSprint: pbis.filter((p) => sit.get(p.id) === "sem_sprint" && !ars.flat().includes(p.id)),
    concluidosSoltos: soltos.map((i) => porId.get(i)!).filter((p) => sit.get(p.id) === "concluido"),
    legado: todos.filter((p) => legadoIds.has(p.id)),
    frase: partes.join(" "),
    proxima,
    contagem: { total: pbis.length, concluido: contagem("concluido"), atrasado: contagem("atrasado"), risco: contagem("risco"), ligacoes: ars.length },
  };
}
