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
  codigoCatalogo: string | null;
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

// --- UST da X-VIA × ETP -----------------------------------------------------
// A X-VIA não preenche a atividade UST do TFS: o código do catálogo dela vem da
// descrição da Task ("Catálogo DOC.07 …"). Só conta o que está na área que a
// X-VIA fatura (XVIA\Customização UST). Valores pela tabela do ETP (pp. 68–71).

export const AREA_UST = "XVIA\\Customização UST";

export type EtpLinha = { codigo: string | null; servico: string; ust: number; ocorrencia: number; complexidade?: string };
export type EtpUst = {
  totalEtp: number;
  totalEstrutural: number;
  perfis: { perfil: string; servicos: number; ustPorServico: number; itens: EtpLinha[] }[];
  estruturais: EtpLinha[];
};

export type CodigoEtp = { codigo: string; servico: string; ustUnitaria: number; previsto: number };

/** Por código: UST unitária (do perfil; senão da linha estrutural) e UST
 * prevista no ETP (ocorrência × nº de serviços do perfil + linhas estruturais). */
export function ustEtp(etp: EtpUst): Map<string, CodigoEtp> {
  const mapa = new Map<string, CodigoEtp>();
  const somar = (l: EtpLinha, mult: number, doPerfil: boolean) => {
    if (!l.codigo) return;
    const atual = mapa.get(l.codigo);
    if (!atual) {
      mapa.set(l.codigo, { codigo: l.codigo, servico: l.servico, ustUnitaria: l.ust, previsto: l.ust * l.ocorrencia * mult });
      return;
    }
    atual.previsto += l.ust * l.ocorrencia * mult;
    if (doPerfil) Object.assign(atual, { servico: l.servico, ustUnitaria: l.ust });
  };
  for (const p of etp.perfis) for (const l of p.itens) somar(l, p.servicos, true);
  for (const l of etp.estruturais) somar(l, 1, false);
  return mapa;
}

export type SituacaoUst = "sem código" | "faixa a definir" | "fora do ETP";
export type LinhaCodigo = CodigoEtp & { tarefas: number; lancada: number; executada: number; saldo: number; itens: TfsItem[] };

export function ehTarefaXvia(i: TfsItem) {
  return i.tipo === "Task" && i.estado !== "Removed" && (i.area === AREA_UST || i.area.startsWith(`${AREA_UST}\\`));
}

/** Lançado = toda Task com código do ETP (UST unitária × 1); executado = as Done.
 * Task sem código, com faixa (NEG.03/04/05) ou código fora do ETP fica "a
 * classificar": fora da soma, listada para a X-VIA corrigir. */
export function execucaoXvia(itens: TfsItem[], etp: EtpUst | null, contrato: TfsContrato | null) {
  const tabela = etp ? ustEtp(etp) : new Map<string, CodigoEtp>();
  const tarefas = itens.filter(ehTarefaXvia);
  const porCodigo = new Map<string, LinhaCodigo>();
  const aClassificar: (TfsItem & { situacao: SituacaoUst })[] = [];

  for (const t of tarefas) {
    const cod = t.codigoCatalogo;
    const ref = cod ? tabela.get(cod) : undefined;
    if (!ref) {
      const situacao: SituacaoUst = !cod ? "sem código" : cod.includes("/") ? "faixa a definir" : "fora do ETP";
      aClassificar.push({ ...t, situacao });
      continue;
    }
    const linha = porCodigo.get(ref.codigo) ?? { ...ref, tarefas: 0, lancada: 0, executada: 0, saldo: ref.previsto, itens: [] };
    linha.tarefas += 1;
    linha.lancada += ref.ustUnitaria;
    if (t.estado === "Done") linha.executada += ref.ustUnitaria;
    linha.saldo = linha.previsto - linha.lancada;
    linha.itens.push(t);
    porCodigo.set(ref.codigo, linha);
  }
  // Códigos do ETP ainda sem nenhuma Task também aparecem: mostram o que falta usar.
  for (const ref of tabela.values()) {
    if (!porCodigo.has(ref.codigo)) porCodigo.set(ref.codigo, { ...ref, tarefas: 0, lancada: 0, executada: 0, saldo: ref.previsto, itens: [] });
  }

  const contagemAClassificar: Record<SituacaoUst, number> = { "sem código": 0, "faixa a definir": 0, "fora do ETP": 0 };
  for (const t of aClassificar) contagemAClassificar[t.situacao] += 1;

  const linhas = [...porCodigo.values()].sort((a, b) => b.lancada - a.lancada || b.previsto - a.previsto);
  const ustExecutada = linhas.reduce((s, l) => s + l.executada, 0);
  const ustLancada = linhas.reduce((s, l) => s + l.lancada, 0);
  const total = contrato?.ustTotalTr ?? etp?.totalEtp ?? null;
  const valorUst = contrato?.valorUst ?? null;
  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : null);
  return {
    tarefas: tarefas.length,
    ustExecutada,
    ustLancada,
    ustTotal: total,
    pctExecutado: pct(ustExecutada),
    pctLancado: pct(ustLancada),
    valorExecutado: valorUst === null ? null : ustExecutada * valorUst,
    valorLancado: valorUst === null ? null : ustLancada * valorUst,
    porCodigo: linhas,
    aClassificar,
    contagemAClassificar,
  };
}

// --- Filtros do painel (ficam na URL) --------------------------------------

export type Filtros = { modulo: string; frente: string; orgao: string; sprint: string };
export const FILTROS_VAZIOS: Filtros = { modulo: "", frente: "", orgao: "", sprint: "" };

export function filtrarItens(itens: TfsItem[], f: Filtros): TfsItem[] {
  return itens.filter(
    (i) =>
      (!f.modulo || i.epico === f.modulo) &&
      (!f.frente || i.frente === f.frente) &&
      (!f.orgao || i.orgao === f.orgao) &&
      (!f.sprint || i.sprint === f.sprint),
  );
}

export function opcoesFiltro(itens: TfsItem[]) {
  const unicos = (vals: (string | null)[]) =>
    [...new Set(vals.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return {
    modulo: unicos(itens.map((i) => i.epico)),
    orgao: unicos(itens.map((i) => i.orgao)),
    sprint: unicos(itens.map((i) => i.sprint)),
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
