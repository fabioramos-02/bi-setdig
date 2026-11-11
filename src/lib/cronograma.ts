/**
 * Cronograma executivo de entregas e dependências (PBI #1348598) — porte da lógica de
 * lancar-demandas-xvia/src/cronograma.py. Uma barra por PBI na sprint dele, cadeias de
 * dependência (só links Predecessor/Successor; Related não conta) e a situação de cada um.
 * Funções puras; o desenho fica em projeto-xvia/CronogramaTab.tsx.
 */
import type { TfsItem, TfsSprint } from "./tfs.ts";

export type Situacao = "concluido" | "atrasado" | "esperando" | "nao_iniciado" | "risco" | "andamento" | "futuro" | "sem_sprint";
export const ROTULO_SITUACAO: Record<Situacao, string> = {
  concluido: "Pronto", atrasado: "Atrasado", esperando: "Esperando órgão/decisão", nao_iniciado: "Não iniciado",
  risco: "Em risco", andamento: "Em andamento", futuro: "Futuro", sem_sprint: "A planejar",
};
/** Da pior para a melhor: a situação de uma Feature é a pior entre os PBIs abertos dela. */
export const GRAVIDADE: Situacao[] = ["atrasado", "esperando", "nao_iniciado", "risco", "sem_sprint", "andamento", "futuro", "concluido"];

// Colunas do quadro que dizem o motivo de um PBI aberto (Fabio, 11/11/2026): parado esperando
// alguém não é atraso da X-VIA; parado sem começar é falta de replanejamento.
const ESPERA = new Set(["Aguardando Validação do Órgão", "Aguardando decisão", "Impedido"]);
const NAO_COMECOU = new Set(["A fazer", "Área de Negócios"]);
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

/** Situação de cada PBI, com o motivo:
 * - Done = pronto; parado em Aguardando Validação do Órgão / decisão / Impedido = esperando;
 * - sprint encerrada: em A fazer ou Área de Negócios = não iniciado (replanejar); senão atrasado;
 * - risco = não está pronto e algum predecessor não está andando (atrasado, esperando, não
 *   iniciado, sem sprint) ou está numa sprint igual ou posterior (não dá tempo de terminar antes). */
export function situacoes(pbis: TfsItem[], sprints: TfsSprint[], ars: Aresta[], hoje: string): Map<number, Situacao> {
  const sp = new Map(sprints.map((s) => [s.sprint, s]));
  const base = new Map<number, Situacao>();
  for (const p of pbis) {
    const s = sp.get(p.sprint);
    base.set(p.id,
      p.estado === "Done" ? "concluido"
        : ESPERA.has(p.coluna ?? "") ? "esperando"
        : !s ? "sem_sprint"
        : s.fim < hoje ? (NAO_COMECOU.has(p.coluna ?? "") ? "nao_iniciado" : "atrasado")
        : s.inicio <= hoje ? "andamento" : "futuro");
  }
  const final = new Map(base);
  const porId = new Map(pbis.map((p) => [p.id, p]));
  const parado: Situacao[] = ["atrasado", "esperando", "nao_iniciado", "sem_sprint"];
  for (const [a, b] of ars) {
    const sb0 = base.get(b);
    if ((sb0 !== "andamento" && sb0 !== "futuro") || base.get(a) === "concluido") continue;
    const sa = sp.get(porId.get(a)?.sprint ?? "");
    const sb = sp.get(porId.get(b)?.sprint ?? "");
    if (parado.includes(base.get(a)!) || (sa && sb && sa.inicio >= sb.inicio)) final.set(b, "risco");
  }
  return final;
}

/** Dependências planejadas ao contrário: a predecessora está numa sprint DEPOIS da sucessora.
 * É erro de planejamento a corrigir no TFS; o desenho mostra em vermelho. */
export function invertidas(pbis: TfsItem[], sprints: TfsSprint[], ars: Aresta[]): Aresta[] {
  const sp = new Map(sprints.map((s) => [s.sprint, s]));
  const porId = new Map(pbis.map((p) => [p.id, p]));
  return ars.filter(([a, b]) => {
    const sa = sp.get(porId.get(a)?.sprint ?? ""), sb = sp.get(porId.get(b)?.sprint ?? "");
    return !!sa && !!sb && sa.inicio > sb.inicio;
  });
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

/** Monta o cronograma de PBIs de um recorte: blocos (cadeias e soltos abertos), colunas de
 * sprint, situação de cada PBI e a frase-âncora. Com `featureId`, a situação ainda considera o
 * épico inteiro (risco por dependência de outra Feature), mas o desenho mostra só a Feature. */
export function montarCronograma(itens: TfsItem[], sprints: TfsSprint[], epicoId: number | null, hoje: string, featureId: number | null = null) {
  const todos = pbisDoEpico(itens, epicoId);
  const ordenadas = [...sprints].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const todasArestas = arestas(todos);
  const legadoIds = legadoSgd(todos, ordenadas, todasArestas, hoje);
  const pbis = todos.filter((p) => !legadoIds.has(p.id));
  const ars = todasArestas.filter(([a, b]) => !legadoIds.has(a) && !legadoIds.has(b));
  const sit = situacoes(pbis, ordenadas, ars, hoje);
  const inv = invertidas(pbis, ordenadas, ars);
  if (featureId !== null) {
    const ids = new Set(pbis.filter((p) => p.featureId === featureId).map((p) => p.id));
    pbis.splice(0, pbis.length, ...pbis.filter((p) => ids.has(p.id)));
    ars.splice(0, ars.length, ...ars.filter(([a, b]) => ids.has(a) && ids.has(b)));
  }
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
    invertidas: inv.filter(([a, b]) => porId.has(a) && porId.has(b)),
    soltosAbertos: soltos.map((i) => porId.get(i)!).filter((p) => sit.get(p.id) !== "concluido"),
    contagem: {
      total: pbis.length, concluido: contagem("concluido"), atrasado: contagem("atrasado"), risco: contagem("risco"),
      esperando: contagem("esperando"), naoIniciado: contagem("nao_iniciado"), ligacoes: ars.length,
    },
  };
}

// --- Visão macro: uma linha por Feature (ou por épico na visão geral) --------
// Pedido do Fabio (11/11/2026): o gerente acompanha o épico pelas Features; os PBIs ficam um
// clique abaixo. A barra vai da primeira à última sprint dos PBIs (Start/Target Date das Features
// ainda vazios no TFS, task #1375476); a situação é a pior entre os PBIs abertos.

export type LinhaMacro = {
  id: number | null;
  titulo: string;
  frente: string;
  estado: string | null;
  pbis: TfsItem[];
  prontos: number;
  total: number;
  ini: number | null; // índice em `colunas`
  fim: number | null;
  aPlanejar: number; // PBIs abertos sem sprint
  situacao: Situacao | "vazio";
  contagem: Partial<Record<Situacao, number>>;
};
export type LigacaoMacro = { de: number | null; para: number | null; invertida: boolean; pares: Aresta[] };

export function montarPorFeature(itens: TfsItem[], sprints: TfsSprint[], epicoId: number | null, hoje: string) {
  const ordenadas = [...sprints].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const ordem = new Map(ordenadas.map((s, n) => [s.sprint, n]));
  const todos = pbisDoEpico(itens, epicoId);
  const ars = arestas(todos);
  const sit = situacoes(todos, ordenadas, ars, hoje);
  const inv = new Set(invertidas(todos, ordenadas, ars).map(([a, b]) => `${a}>${b}`));
  const geral = epicoId === null;
  const chaveDe = (p: TfsItem) => (geral ? p.epicoId : p.featureId);
  const tipo = geral ? "Epic" : "Feature";
  const fontes = itens
    .filter((i) => i.tipo === tipo && i.estado !== "Removed" && (geral || i.epicoId === epicoId))
    .map((i) => ({ id: i.id as number | null, titulo: i.titulo, frente: i.frente as string, estado: i.estado as string | null, prazo: i.prazo, inicio: i.inicioPrevisto }));
  if (todos.some((p) => chaveDe(p) === null)) fontes.push({ id: null, titulo: geral ? "Sem épico" : "Sem Feature", frente: "—", estado: null, prazo: null, inicio: null });

  const hojeIdx = ordenadas.findIndex((s) => s.inicio <= hoje && hoje <= s.fim);
  const linhas: LinhaMacro[] = fontes.map((f) => {
    const ps = todos.filter((p) => chaveDe(p) === f.id);
    const idxs = ps.map((p) => ordem.get(p.sprint)).filter((n): n is number => n !== undefined);
    const contagem: Partial<Record<Situacao, number>> = {};
    for (const p of ps) contagem[sit.get(p.id)!] = (contagem[sit.get(p.id)!] ?? 0) + 1;
    const prontos = contagem.concluido ?? 0;
    return {
      id: f.id, titulo: f.titulo, frente: f.frente, estado: f.estado, pbis: ps, prontos, total: ps.length,
      ini: idxs.length ? Math.min(...idxs) : null, fim: idxs.length ? Math.max(...idxs) : null,
      aPlanejar: contagem.sem_sprint ?? 0,
      contagem,
      situacao: !ps.length ? "vazio" : prontos === ps.length ? "concluido" : GRAVIDADE.find((g) => g !== "concluido" && contagem[g]) ?? "andamento",
    } satisfies LinhaMacro;
  }).sort((a, b) => (a.ini ?? 999) - (b.ini ?? 999) || (a.fim ?? 999) - (b.fim ?? 999) || (a.id ?? 0) - (b.id ?? 0));

  // Ligações entre linhas, a partir dos links entre PBIs de linhas diferentes.
  const linhaDe = new Map(todos.map((p) => [p.id, chaveDe(p)]));
  const lig = new Map<string, LigacaoMacro>();
  for (const [a, b] of ars) {
    const de = linhaDe.get(a) ?? null, para = linhaDe.get(b) ?? null;
    if (de === para) continue;
    const l = lig.get(`${de}>${para}`) ?? { de, para, invertida: false, pares: [] };
    l.pares.push([a, b]);
    if (inv.has(`${a}>${b}`)) l.invertida = true;
    lig.set(`${de}>${para}`, l);
  }

  // Colunas: da primeira sprint com PBI até duas sprints depois de hoje.
  const usados = linhas.flatMap((l) => [l.ini, l.fim]).filter((n): n is number => n !== null);
  const primeira = usados.length ? Math.min(...usados) : Math.max(hojeIdx, 0);
  const ultima = Math.max(...usados, hojeIdx + 2);
  const colunas = ordenadas.slice(primeira, Math.min(ultima, ordenadas.length - 1) + 1);
  for (const l of linhas) {
    if (l.ini !== null) l.ini -= primeira;
    if (l.fim !== null) l.fim -= primeira;
  }

  // O que o gerente faz agora — só PBIs da X-VIA; os da SGD são contados à parte.
  const xv = todos.filter((p) => p.frente === "X-VIA");
  const de = (s: Situacao) => xv.filter((p) => sit.get(p.id) === s);
  const porId = new Map(todos.map((p) => [p.id, p]));
  const pares = [...inv].map((k) => k.split(">").map(Number) as Aresta);
  const aFazer = {
    replanejar: de("nao_iniciado"),
    cobrar: de("esperando"),
    atrasos: de("atrasado"),
    invertidas: pares.map(([a, b]) => ({ antes: porId.get(a)!, depois: porId.get(b)! })),
  };
  const sgdParados = todos.filter((p) => p.frente === "SGD" && ["nao_iniciado", "atrasado", "esperando"].includes(sit.get(p.id)!)).length;

  const fontesPorId = new Map(fontes.map((f) => [f.id, f]));
  const alertas = {
    fechadaComAberto: linhas.filter((l) => l.estado === "Done" && l.prontos < l.total),
    vazias: linhas.filter((l) => l.situacao === "vazio" && l.id !== null),
    semDatas: geral ? [] : linhas.filter((l) => l.id !== null && !fontesPorId.get(l.id)?.prazo && !fontesPorId.get(l.id)?.inicio),
  };

  const prontos = todos.filter((p) => sit.get(p.id) === "concluido").length;
  const unidade = geral ? "módulos" : "Features";
  const partes = [`${prontos} de ${todos.length} entregas prontas em ${linhas.filter((l) => l.id !== null).length} ${unidade}.`];
  if (aFazer.replanejar.length) partes.push(`${aFazer.replanejar.length} da X-VIA ficaram em sprint vencida sem começar e precisam ser replanejadas.`);
  if (aFazer.cobrar.length) partes.push(`${aFazer.cobrar.length} esperam o órgão ou uma decisão.`);
  partes.push(aFazer.atrasos.length ? `${aFazer.atrasos.length} ${aFazer.atrasos.length === 1 ? "é atraso real" : "são atrasos reais"} da X-VIA em desenvolvimento.` : "Nenhum atraso real da X-VIA em desenvolvimento.");
  if (sgdParados) partes.push(`Itens da SGD parados: ${sgdParados}.`);

  return {
    linhas, colunas, hojeIdx: hojeIdx < 0 ? null : hojeIdx - primeira, ligacoes: [...lig.values()],
    situacao: sit, aFazer, sgdParados, alertas, frase: partes.join(" "),
    prontos, total: todos.length,
  };
}
