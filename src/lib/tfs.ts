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
  empresa?: string | null; // contrato marcado na Task ("Governo do Estado" ou o da X-VIA); ausente em extração antiga
  atividadeUst: string | null;
  complexidadeUst: string | null;
  ust: number | null;
  dataExecucao: string | null;
  codigoCatalogo: string | null;
  // Extração de 11/2026 em diante; ausentes em snapshot antigo.
  responsavel?: string | null;
  inicioPrevisto?: string | null;
  dependeDe?: number[];
  trava?: number[];
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

export type OpcaoInicio = { data: string; fonte: string };

export type TfsContrato = {
  contrato: string;
  fonte?: string;
  vigenciaMeses?: number;
  /** Data única, ou opções com fonte enquanto as fontes divergem ("a conciliar"). */
  inicio: string | { conciliado: boolean; opcoes: OpcaoInicio[] };
  fim: string | null;
  valorTotal?: number | null;
  itens?: { item: number; descricao: string; regime: string; valor: number; quantidadeUst?: number; valorUst?: number }[];
  ustTotalTr: number | null;
  valorUst: number | null;
  previsaoMensal?: { mes: number; ust: number }[];
  previsaoMensalNota?: string;
  faturado?: number | null;
  faturadoNota?: string;
  previsaoPorModulo: { epico: string; ust: number | null }[];
};

/** Origem de um indicador: o que o compõe, para chegar ao registro que o fundamenta. */
export type Origem = { rotulo: string; detalhe: string; itens?: TfsItem[]; link?: { href: string; texto: string } };

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

/** Opções de início do contrato. Uma só quando conciliado (ou data simples). */
export function iniciosContrato(contrato: TfsContrato | null): { opcoes: OpcaoInicio[]; aConciliar: boolean } {
  const ini = contrato?.inicio;
  if (!ini) return { opcoes: [], aConciliar: false };
  if (typeof ini === "string") return { opcoes: [{ data: ini, fonte: "contrato.json" }], aConciliar: false };
  return { opcoes: ini.opcoes, aConciliar: !ini.conciliado && ini.opcoes.length > 1 };
}

export const somarMeses = (iso: string, meses: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
};

/** Prazo: do início do contrato ao fim informado; sem fim, início + vigência do
 * TR; sem os dois, fim da última sprint (marcado como estimado). Com início
 * "a conciliar", calcula para cada opção — a primeira é a principal. */
export function prazoProjeto(contrato: TfsContrato | null, sprints: TfsSprint[], hoje: string) {
  const ordenadas = [...sprints].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const { opcoes, aConciliar } = iniciosContrato(contrato);
  const base = opcoes.length ? opcoes : [{ data: ordenadas[0]?.inicio ?? hoje, fonte: "primeira sprint" }];
  const calc = (o: OpcaoInicio) => {
    const fimContrato = contrato?.fim ?? (contrato?.vigenciaMeses ? somarMeses(o.data, contrato.vigenciaMeses) : null);
    const fim = fimContrato ?? ordenadas.at(-1)?.fim ?? hoje;
    const total = Math.max(diasEntre(o.data, fim), 1);
    const decorridos = Math.min(Math.max(diasEntre(o.data, hoje), 0), total);
    const mesDoContrato = Math.min(Math.max(Math.floor(decorridos / 30.44) + 1, 1), contrato?.vigenciaMeses ?? 99);
    return {
      inicio: o.data,
      fonteInicio: o.fonte,
      fim,
      fimEstimado: fimContrato === null,
      diasRestantes: Math.max(diasEntre(hoje, fim), 0),
      pctDecorrido: Math.round((decorridos / total) * 100),
      mesDoContrato,
    };
  };
  const todas = base.map(calc);
  return { ...todas[0], aConciliar, opcoes: todas, sprintAtual: sprintAtual(sprints) };
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
// Conta só o catálogo do contrato da X-VIA (revisão de 2026-11-03):
// - Task com o contrato da X-VIA marcado: código e valor da atividade marcada;
// - Task sem contrato (anterior à marcação) na área que a X-VIA fatura
//   (XVIA\Customização UST): código escrito na descrição ("Catálogo DOC.07 …");
// - Task marcada com o contrato do Governo do Estado nunca entra.
// Valor = `ust` do catálogo X-VIA (pipeline); sem ele, a UST unitária do ETP
// (pp. 68–71). Previsto = memória de cálculo do ETP.

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

/** "004/2026 - 30524 - XVIA TECNOLOGIA LTDA" no TFS. */
export const ehContratoXvia = (empresa: string | null | undefined) => /xvia/i.test((empresa ?? "").replace(/-/g, ""));

export function ehTarefaXvia(i: TfsItem) {
  if (i.tipo !== "Task" || i.estado === "Removed") return false;
  if (i.empresa) return ehContratoXvia(i.empresa);
  return i.area === AREA_UST || i.area.startsWith(`${AREA_UST}\\`);
}

/** Lançado = toda Task com código do ETP (UST unitária × 1); executado = as Done.
 * Task sem código, com faixa (NEG.03/04/05) ou código fora do ETP fica "a
 * classificar": fora da soma, listada para a X-VIA corrigir. */
export function execucaoXvia(itens: TfsItem[], etp: EtpUst | null, contrato: TfsContrato | null) {
  const tabela = etp ? ustEtp(etp) : new Map<string, CodigoEtp>();
  const tarefas = itens.filter(ehTarefaXvia);
  const porCodigo = new Map<string, LinhaCodigo>();
  const aClassificar: (TfsItem & { situacao: SituacaoUst })[] = [];
  let valorDoEtp = 0; // tarefas somadas pelo valor do ETP (sem valor no catálogo X-VIA)
  let semContrato = 0; // tarefas somadas só pelo código da descrição

  for (const t of tarefas) {
    const cod = t.codigoCatalogo;
    const ref = cod ? tabela.get(cod) : undefined;
    if (!ref) {
      const situacao: SituacaoUst = !cod ? "sem código" : cod.includes("/") ? "faixa a definir" : "fora do ETP";
      aClassificar.push({ ...t, situacao });
      continue;
    }
    const linha = porCodigo.get(ref.codigo) ?? { ...ref, tarefas: 0, lancada: 0, executada: 0, saldo: ref.previsto, itens: [] };
    const valor = t.ust ?? ref.ustUnitaria; // catálogo X-VIA; sem ele, ETP
    if (t.ust === null) valorDoEtp += 1;
    if (!t.empresa) semContrato += 1;
    linha.tarefas += 1;
    linha.lancada += valor;
    if (t.estado === "Done") linha.executada += valor;
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
    valorDoEtp,
    semContrato,
  };
}

// --- Painel executivo (Nível 1) ----------------------------------------------
// Regra do Fabio (11/2026): consumo de UST NÃO é % de conclusão do projeto.
// `consumoContrato` mede o contrato (Item 3 do TR); `andamentoEntregas`, o
// backlog. Um nunca é derivado do outro.

/** Consumo do Item 3 (UST) frente ao TR: lançado e executado separados do
 * faturado (este fica "a informar" enquanto o TFS não registra). */
export function consumoContrato(itens: TfsItem[], etp: EtpUst | null, contrato: TfsContrato | null, mesDoContrato: number) {
  const x = execucaoXvia(itens, etp, contrato);
  const item3 = contrato?.itens?.find((i) => i.item === 3);
  const previstoAteMes = contrato?.previsaoMensal
    ? contrato.previsaoMensal.filter((p) => p.mes <= mesDoContrato).reduce((s, p) => s + p.ust, 0)
    : null;
  const executadas = x.porCodigo.flatMap((l) => l.itens.filter((t) => t.estado === "Done"));
  const origem: Origem = {
    rotulo: "Tarefas da X-VIA concluídas com código do catálogo",
    detalhe: `UST = soma do valor de cada tarefa da X-VIA concluída (catálogo X-VIA; sem ele, a UST unitária do ETP). R$ = UST × ${contrato?.valorUst ? fmtReais(contrato.valorUst) : "valor a informar"} (TR, 9.3, pág. 53). Total contratado: ${x.ustTotal ? fmtNum(x.ustTotal) : "—"} UST (TR, item 1.1). Previsto até o mês: tabela do TR, 3.3.3.`,
    itens: executadas,
  };
  return {
    ...x,
    previstoAteMes,
    saldoUst: x.ustTotal === null ? null : x.ustTotal - x.ustExecutada,
    valorItem3: item3?.valor ?? null,
    saldoValor: item3 && x.valorExecutado !== null ? item3.valor - x.valorExecutado : null,
    valorTotalContrato: contrato?.valorTotal ?? null,
    faturado: contrato?.faturado ?? null,
    origem,
  };
}

/** Andamento do backlog: entregas (PBI/Bug) em produção sobre as planejadas. */
export function andamentoEntregas(itens: TfsItem[]) {
  const entregas = itens.filter((i) => ehEntrega(i) && i.estado !== "Removed");
  const emProducao = entregas.filter((i) => i.coluna === COLUNA_PRODUCAO);
  const emHomologacao = entregas.filter((i) => i.tags.includes("Em Homologação") && i.coluna !== COLUNA_PRODUCAO);
  const concluidasForaProducao = entregas.filter((i) => i.estado === "Done" && i.coluna !== COLUNA_PRODUCAO);
  const origem: Origem = {
    rotulo: "Entregas na coluna Em Produção",
    detalhe: `${fmtNum(emProducao.length)} de ${fmtNum(entregas.length)} entregas (histórias e bugs, sem as removidas) estão na coluna Em Produção do quadro. Concluído no desenvolvimento, homologado e em produção são contados à parte.`,
    itens: emProducao,
  };
  return {
    planejadas: entregas.length,
    emProducao: emProducao.length,
    pct: entregas.length ? Math.round((emProducao.length / entregas.length) * 100) : 0,
    emHomologacao: emHomologacao.length,
    concluidasForaProducao: concluidasForaProducao.length,
    origem,
  };
}

/** Entrega aberta cuja sprint já encerrou ou cujo prazo (Target Date) venceu.
 * Atraso é informação à parte: não muda o estado (Impedido etc.). */
export function atrasadas(itens: TfsItem[], sprints: TfsSprint[], hoje: string): TfsItem[] {
  const encerradas = new Set(sprints.filter((s) => s.situacao === "encerrada").map((s) => s.sprint));
  return itens.filter(
    (i) => ehEntrega(i) && aberto(i) && (encerradas.has(i.sprint) || (!!i.prazo && i.prazo < hoje)),
  );
}

/** Quem precisa agir: o responsável no TFS; sem ele, a frente — nunca inventado. */
export const quemResolve = (i: TfsItem) =>
  i.responsavel ??
  (i.responsavel === undefined ? `Frente ${i.frente} (responsável ainda não extraído)` : `Não informado (frente ${i.frente})`);

const semSprint = (i: TfsItem) => !i.sprint.includes("\\");

export type Verificacao = { rotulo: string; itens: TfsItem[]; nota?: string };

/** Verificações de qualidade do dado (prompt do painel, item 7). */
export function qualidadeDados(itens: TfsItem[], etp: EtpUst | null, contrato: TfsContrato | null): Verificacao[] {
  const entregas = itens.filter((i) => ehEntrega(i) && aberto(i));
  const temResponsavel = itens.some((i) => i.responsavel !== undefined);
  const notaResp = temResponsavel ? undefined : "O responsável ainda não foi extraído do TFS (rodar o extrator de novo).";
  const x = execucaoXvia(itens, etp, contrato);
  const { aConciliar } = iniciosContrato(contrato);
  const lista: Verificacao[] = [
    { rotulo: "Entregas abertas sem sprint", itens: entregas.filter(semSprint) },
    { rotulo: "Entregas sem épico (módulo)", itens: entregas.filter((i) => !i.epico) },
    { rotulo: "Entregas abertas sem responsável", itens: temResponsavel ? entregas.filter((i) => !i.responsavel) : [], nota: notaResp },
    { rotulo: "Pendências sem responsável", itens: temResponsavel ? entregas.filter((i) => i.pendencia && !i.responsavel) : [], nota: notaResp },
    { rotulo: "Tarefas da X-VIA sem código do catálogo (UST sem origem)", itens: x.aClassificar },
    { rotulo: "Entregas concluídas fora da coluna Em Produção (sem evidência de produção)", itens: itens.filter((i) => ehEntrega(i) && i.estado === "Done" && i.coluna !== COLUNA_PRODUCAO) },
  ];
  if (aConciliar) lista.push({ rotulo: "Início do contrato a conciliar", itens: [], nota: "As fontes divergem; ver contrato.json → inicio.opcoes." });
  return lista;
}

/** Síntese executiva gerada dos números — nunca texto fixo. */
export function sinteseExecutiva(a: {
  pctPrazo: number; diasRestantes: number; aConciliar: boolean; pctEntregas: number;
  ustExecutada: number; previstoAteMes: number | null; decisoes: number; atrasadas: number;
}) {
  const partes = [
    `${a.pctPrazo}% do prazo do contrato já passou${a.aConciliar ? " (data de início a conciliar)" : ""}; faltam ${fmtNum(a.diasRestantes)} dias.`,
    `${a.pctEntregas}% das entregas planejadas estão em produção.`,
  ];
  if (a.previstoAteMes !== null)
    partes.push(`A X-VIA executou ${fmtNum(a.ustExecutada)} UST, frente a ${fmtNum(a.previstoAteMes)} previstas no TR até este mês.`);
  if (a.decisoes) partes.push(`${fmtNum(a.decisoes)} ${a.decisoes === 1 ? "entrega aguarda" : "entregas aguardam"} decisão ou estão impedidas.`);
  if (a.atrasadas) partes.push(`${fmtNum(a.atrasadas)} ${a.atrasadas === 1 ? "passou" : "passaram"} da sprint ou do prazo previsto.`);
  return partes.join(" ");
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
