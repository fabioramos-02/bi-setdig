/**
 * Projeto X-VIA (backlog do TFS) — tipos dos datasets tfs/v1 e os cálculos da
 * página /projeto-xvia. Funções puras; a página só apresenta.
 *
 * "Entrega" = PBI ou Bug (o que anda no board). Task é o trabalho por trás,
 * e é nela que a UST do contrato é lançada.
 */

export type TipoEntrega = "Negócio" | "Órgão" | "Desenvolvimento X-VIA";

export type TfsItem = {
  id: number;
  tipo: string;
  titulo: string;
  estado: string;
  coluna: string | null;
  area: string;
  frente: "X-VIA" | "SGD";
  sprint: string;
  epicoId: number | null;
  epico: string | null;
  featureId: number | null;
  feature: string | null;
  pbiId: number | null;
  orgao: string | null;
  tags: string[];
  tipoEntrega: TipoEntrega | null;
  pendencia: boolean;
  criadoEm: string | null;
  alteradoEm: string | null;
  fechadoEm: string | null;
  prazo: string | null;
  diasSemAtualizar: number | null;
  atividadeUst: string | null;
  complexidadeUst: string | null;
  ust: number | null;
  dataExecucao: string | null;
};

export type TfsSprint = {
  sprint: string;
  nome: string;
  inicio: string;
  fim: string;
  situacao: "encerrada" | "atual" | "futura";
};

export type TfsStakeholder = {
  sigla: string;
  nome: string;
  secretario: string | null;
  site: string | null;
  pontoFocal: string | null;
  contato: string | null;
  papel: "piloto" | "parceiro" | null;
  modulos: string[];
};

export type TfsContrato = {
  contrato: string;
  inicio: string;
  fim: string | null;
  ustTotalTr: number | null;
  valorUst: number | null;
  previsaoPorModulo: { epico: string; ust: number | null }[];
};

export const TIPOS_ENTREGA: TipoEntrega[] = ["Negócio", "Órgão", "Desenvolvimento X-VIA"];
export const COLUNA_PRODUCAO = "Em Produção";
const TFS_EDIT = "https://tfs.sgi.ms.gov.br/tfs/Global/XVIA/_workitems/edit/";

export const linkTfs = (id: number) => `${TFS_EDIT}${id}`;
export const ehEntrega = (i: TfsItem) => i.tipo === "Product Backlog Item" || i.tipo === "Bug";
const aberto = (i: TfsItem) => i.estado !== "Done" && i.estado !== "Removed";
const DIA_MS = 86_400_000;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA_MS);

export function sprintAtual(sprints: TfsSprint[]): TfsSprint | null {
  return sprints.find((s) => s.situacao === "atual") ?? null;
}

/** Prazo: do início do contrato ao fim informado no TR; sem ele, ao fim da
 * última sprint cadastrada (marcado como estimado). */
export function prazoProjeto(contrato: TfsContrato | null, sprints: TfsSprint[], hoje: string) {
  const ordenadas = [...sprints].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const inicio = contrato?.inicio ?? ordenadas[0]?.inicio ?? hoje;
  const fimContrato = contrato?.fim ?? null;
  const fim = fimContrato ?? ordenadas.at(-1)?.fim ?? hoje;
  const total = Math.max(diasEntre(inicio, fim), 1);
  const decorridos = Math.min(Math.max(diasEntre(inicio, hoje), 0), total);
  return {
    inicio,
    fim,
    fimEstimado: fimContrato === null,
    diasRestantes: Math.max(diasEntre(hoje, fim), 0),
    pctDecorrido: Math.round((decorridos / total) * 100),
    sprintAtual: sprintAtual(sprints),
  };
}

export function resumoEntregas(itens: TfsItem[]) {
  const entregas = itens.filter((i) => ehEntrega(i) && i.estado !== "Removed");
  const emProducao = entregas.filter((i) => i.coluna === COLUNA_PRODUCAO).length;
  const pendencias = entregas.filter((i) => i.pendencia).length;
  return {
    total: entregas.length,
    emProducao,
    pctProducao: entregas.length ? Math.round((emProducao / entregas.length) * 100) : 0,
    pendencias,
    abertas: entregas.filter(aberto).length,
  };
}

export type LinhaModulo = {
  epico: string;
  total: number;
  xvia: number;
  sgd: number;
  emProducao: number;
  pendencias: number;
  porTipo: Record<TipoEntrega, number>;
};

/** Entregas por módulo (épico), separando as frentes X-VIA e SGD. */
export function porModulo(itens: TfsItem[]): LinhaModulo[] {
  const mapa = new Map<string, LinhaModulo>();
  for (const i of itens) {
    if (!ehEntrega(i) || i.estado === "Removed") continue;
    const epico = i.epico ?? "Sem épico";
    const m = mapa.get(epico) ?? {
      epico, total: 0, xvia: 0, sgd: 0, emProducao: 0, pendencias: 0,
      porTipo: { "Negócio": 0, "Órgão": 0, "Desenvolvimento X-VIA": 0 },
    };
    m.total += 1;
    if (i.frente === "SGD") m.sgd += 1;
    else m.xvia += 1;
    if (i.coluna === COLUNA_PRODUCAO) m.emProducao += 1;
    if (i.pendencia) m.pendencias += 1;
    if (i.tipoEntrega) m.porTipo[i.tipoEntrega] += 1;
    mapa.set(epico, m);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

/** Pendências abertas, as mais paradas primeiro. */
export function pendencias(itens: TfsItem[]): TfsItem[] {
  return itens
    .filter((i) => i.pendencia)
    .sort((a, b) => (b.diasSemAtualizar ?? 0) - (a.diasSemAtualizar ?? 0));
}

/** Entregas priorizadas na sprint atual, por coluna do board. */
export function entregasDaSprint(itens: TfsItem[], sprint: TfsSprint | null) {
  if (!sprint) return { itens: [] as TfsItem[], porColuna: [] as { coluna: string; total: number }[] };
  const daSprint = itens.filter((i) => ehEntrega(i) && i.sprint === sprint.sprint && i.estado !== "Removed");
  const contagem = new Map<string, number>();
  for (const i of daSprint) contagem.set(i.coluna ?? "Sem coluna", (contagem.get(i.coluna ?? "Sem coluna") ?? 0) + 1);
  return {
    itens: daSprint,
    porColuna: [...contagem].map(([coluna, total]) => ({ coluna, total })).sort((a, b) => b.total - a.total),
  };
}

/** Entregas concluídas no mês (AAAA-MM), agrupadas pela sprint em que estavam. */
export function entregasDoMes(itens: TfsItem[], mes: string) {
  const concluidas = itens.filter((i) => ehEntrega(i) && i.estado === "Done" && i.fechadoEm?.startsWith(mes));
  const porSprint = new Map<string, TfsItem[]>();
  for (const i of concluidas) porSprint.set(i.sprint, [...(porSprint.get(i.sprint) ?? []), i]);
  return [...porSprint].map(([sprint, lista]) => ({ sprint, itens: lista })).sort((a, b) => a.sprint.localeCompare(b.sprint));
}

/** UST: executada = Tasks Done com atividade do contrato; priorizada = Tasks
 * ainda abertas na sprint atual ou nas futuras. Valor em R$ só com o R$/UST
 * do TR preenchido. */
export function execucaoFinanceira(itens: TfsItem[], sprints: TfsSprint[], contrato: TfsContrato | null) {
  const tasks = itens.filter((i) => i.tipo === "Task" && i.estado !== "Removed");
  const vigentes = new Set(sprints.filter((s) => s.situacao !== "encerrada").map((s) => s.sprint));
  const comUst = tasks.filter((t) => t.ust !== null);
  const soma = (lista: TfsItem[]) => lista.reduce((s, t) => s + (t.ust ?? 0), 0);
  const executadas = comUst.filter((t) => t.estado === "Done");
  const priorizadas = comUst.filter((t) => aberto(t) && vigentes.has(t.sprint));

  const mapa = new Map<string, { epico: string; executada: number; priorizada: number; previsao: number | null }>();
  for (const t of comUst) {
    const epico = t.epico ?? "Sem épico";
    const m = mapa.get(epico) ?? {
      epico, executada: 0, priorizada: 0,
      previsao: contrato?.previsaoPorModulo.find((p) => p.epico === epico)?.ust ?? null,
    };
    if (t.estado === "Done") m.executada += t.ust ?? 0;
    else if (vigentes.has(t.sprint)) m.priorizada += t.ust ?? 0;
    mapa.set(epico, m);
  }

  const ustExecutada = soma(executadas);
  const valorUst = contrato?.valorUst ?? null;
  const totalTr = contrato?.ustTotalTr ?? null;
  return {
    ustExecutada,
    ustPriorizada: soma(priorizadas),
    ustTotalTr: totalTr,
    pctTr: totalTr ? Math.round((ustExecutada / totalTr) * 1000) / 10 : null,
    valorExecutado: valorUst === null ? null : ustExecutada * valorUst,
    valorPriorizado: valorUst === null ? null : soma(priorizadas) * valorUst,
    tasksTotal: tasks.length,
    tasksSemUst: tasks.length - comUst.length,
    porModulo: [...mapa.values()].sort((a, b) => b.executada + b.priorizada - (a.executada + a.priorizada)),
  };
}

export type LinhaStakeholder = TfsStakeholder & { itens: number; modulosNoTfs: string[] };

/** Órgãos com itens no backlog (ou com papel definido) primeiro. */
export function stakeholdersDoProjeto(stakeholders: TfsStakeholder[], itens: TfsItem[]): LinhaStakeholder[] {
  return stakeholders
    .map((s) => {
      const doOrgao = itens.filter((i) => i.orgao === s.sigla && ehEntrega(i));
      const modulos = [...new Set(doOrgao.map((i) => i.epico).filter((e): e is string => !!e))];
      return { ...s, itens: doOrgao.length, modulosNoTfs: s.modulos.length ? s.modulos : modulos };
    })
    .filter((s) => s.itens > 0 || s.papel !== null)
    .sort((a, b) => b.itens - a.itens);
}

export const fmtData = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—";
export const fmtNum = (n: number) => n.toLocaleString("pt-BR");
export const fmtReais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
