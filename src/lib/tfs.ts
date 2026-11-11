/**
 * Projeto X-VIA (backlog do TFS) — tipos dos datasets tfs/v1 e os cálculos da
 * página /projeto-xvia. Funções puras; a página só apresenta.
 *
 * "Entrega" = PBI ou Bug (o que anda no board). Task é o trabalho por trás,
 * e é nela que a UST do contrato é lançada.
 */

export type TipoEntrega = "Negócio" | "Órgão" | "Desenvolvimento X-VIA";

/** Quem responde pelo item (ADR-017). Classificado no pipeline (transform/tfs.py:frente):
 * Task pelo contrato; demais pela área, título "[SGD]" ou épico SGD. Nunca pelo nome da pessoa.
 * "Não identificado" fica fora de todo total da X-VIA e vai para a validação. */
export type Frente = "X-VIA" | "SGD" | "Não identificado";
export const NAO_IDENTIFICADO: Frente = "Não identificado";
export const FRENTES: Frente[] = ["X-VIA", "SGD", NAO_IDENTIFICADO];
/** Só o que é da contratada: indicadores de execução, entregas e financeiro da X-VIA. */
export const soXvia = (itens: TfsItem[]) => itens.filter((i) => i.frente === "X-VIA");

export type TfsItem = {
  id: number;
  tipo: string;
  titulo: string;
  estado: string;
  coluna: string | null;
  area: string;
  frente: Frente;
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
  orgaoOrigem?: "campo" | "feature" | null;
  faturado?: string | null; // Custom.SGI.Faturado — vazio no TFS em 11/2026, formato a definir
  dataFaturamento?: string | null;
  timeSgd?: boolean; // responsável é do time interno da SGD — só alerta de qualidade, não classifica
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
  ans?: Ans;
  previsaoPorModulo: { epico: string; ust: number | null }[];
};

/** Prazos de atendimento do TR 4.3.1 (SLA). `medicao` fica null enquanto não houver fonte:
 * o SLA vale para o atendimento de problemas (suporte), e os chamados não passam pelo TFS. */
export type Ans = {
  fonte: string;
  aplicaA: string;
  prioridades: { prioridade: string; inicio: string; solucao: string; aceitavel: number; glosa: string }[];
  medicao: null | { mes: string; porPrioridade: { prioridade: string; noPrazo: number; total: number }[]; fonte: string };
  medicaoNota?: string;
};

/** Origem de um indicador: o que o compõe, para chegar ao registro que o fundamenta. */
export type Origem = {
  rotulo: string;
  detalhe: string;
  itens?: TfsItem[];
  link?: { href: string; texto: string };
  /** Título do modal: o número em si ("553 UST executadas"). */
  numero?: string;
  /** A conta, um passo por linha; o último é o resultado. */
  passos?: string[];
  fonte?: string;
  /** Coluna numérica e subtotal por grupo (ex.: UST da tarefa). */
  valor?: { rotulo: string; de: (i: TfsItem) => number | null };
  agruparPor?: "epico" | "orgao" | "coluna";
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
    // Mês civil: o mês da assinatura é o 1 (jun/2026 = 1, nov/2026 = 6). Decisão do Fabio, 11/11/2026.
    const mesCivil = (Number(hoje.slice(0, 4)) - Number(o.data.slice(0, 4))) * 12 + Number(hoje.slice(5, 7)) - Number(o.data.slice(5, 7)) + 1;
    const mesDoContrato = Math.min(Math.max(mesCivil, 1), contrato?.vigenciaMeses ?? mesCivil);
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

/** Task que conta na UST da X-VIA: frente X-VIA (contrato; ADR-017). A segunda condição é
 * trava de segurança no ponto do dinheiro: contrato que não é da X-VIA nunca soma, mesmo com
 * snapshot antigo ou frente errada. */
export function ehTarefaXvia(i: TfsItem) {
  return i.tipo === "Task" && i.estado !== "Removed" && i.frente === "X-VIA" && (!i.empresa || ehContratoXvia(i.empresa));
}

export type UstTarefa = { ref: CodigoEtp; valor: number; foraDoEtp: boolean } | { situacao: SituacaoUst };

/** Única regra de valor da Task (usada pelo total e pela soma por órgão, que assim fecham):
 * código do ETP → valor do catálogo X-VIA, senão a UST unitária do ETP; código fora do ETP com
 * valor no catálogo X-VIA (oficial, Fabio 10/11/2026) conta, com previsto 0; o resto fica a classificar. */
export function ustDaTarefa(t: TfsItem, tabela: Map<string, CodigoEtp>): UstTarefa {
  const cod = t.codigoCatalogo;
  const ref = cod ? tabela.get(cod) : undefined;
  if (ref) return { ref, valor: t.ust ?? ref.ustUnitaria, foraDoEtp: false };
  if (cod && t.ust != null && !cod.includes("/"))
    return { ref: { codigo: cod, servico: t.atividadeUst ?? cod, ustUnitaria: t.ust, previsto: 0 }, valor: t.ust, foraDoEtp: true };
  return { situacao: !cod ? "sem código" : cod.includes("/") ? "faixa a definir" : "fora do ETP" };
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

  let foraDoEtp = 0; // código válido no catálogo X-VIA (oficial), sem previsão no ETP
  for (const t of tarefas) {
    const u = ustDaTarefa(t, tabela);
    if ("situacao" in u) {
      aClassificar.push({ ...t, situacao: u.situacao });
      continue;
    }
    const { ref, valor } = u;
    if (u.foraDoEtp) foraDoEtp += 1;
    const linha = porCodigo.get(ref.codigo) ?? { ...ref, tarefas: 0, lancada: 0, executada: 0, saldo: ref.previsto, itens: [] };
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
    foraDoEtp,
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
  const tabela = etp ? ustEtp(etp) : new Map<string, CodigoEtp>();
  const passos = [
    `${fmtNum(executadas.length)} tarefas da X-VIA concluídas, com atividade do catálogo`,
    `somam ${fmtNum(x.ustExecutada)} UST (valor de cada atividade no catálogo da X-VIA)`,
  ];
  if (contrato?.valorUst && x.valorExecutado !== null) passos.push(`× ${fmtReais(contrato.valorUst)} por UST = ${fmtReais(x.valorExecutado)}`);
  if (previstoAteMes !== null) passos.push(`o TR previa ${fmtNum(previstoAteMes)} UST até o mês ${mesDoContrato}: executado = ${fmtNum(previstoAteMes ? Math.round((x.ustExecutada / previstoAteMes) * 100) : 0)}% do previsto`);
  const origem: Origem = {
    rotulo: "Tarefas da X-VIA concluídas com código do catálogo",
    numero: `${fmtNum(x.ustExecutada)} UST executadas`,
    passos,
    fonte: `TFS (tarefas com o contrato da X-VIA) · valor da UST: TR 9.3 · previsão mensal: TR 3.3.3 · total contratado: ${x.ustTotal ? fmtNum(x.ustTotal) : "—"} UST (TR 1.1)`,
    detalhe: "Tarefas da X-VIA concluídas que têm atividade do catálogo; tarefas sem atividade ficam fora da soma e aparecem em Qualidade dos dados.",
    itens: executadas,
    valor: { rotulo: "UST", de: (t) => { const u = ustDaTarefa(t, tabela); return "situacao" in u ? null : u.valor; } },
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
  const pct = entregas.length ? Math.round((emProducao.length / entregas.length) * 100) : 0;
  const origem: Origem = {
    rotulo: "Entregas na coluna Em Produção",
    numero: `${fmtNum(emProducao.length)} entregas em produção`,
    passos: [
      `${fmtNum(entregas.length)} entregas planejadas (histórias e bugs, sem as removidas)`,
      `${fmtNum(emProducao.length)} estão na coluna Em Produção do quadro`,
      `${fmtNum(emProducao.length)} ÷ ${fmtNum(entregas.length)} = ${pct}% em produção`,
    ],
    fonte: "TFS: coluna do quadro de cada entrega",
    detalhe: "Concluído no desenvolvimento, homologado e em produção são contados à parte.",
    itens: emProducao,
  };
  return {
    planejadas: entregas.length,
    emProducao: emProducao.length,
    pct,
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
export function qualidadeDados(itens: TfsItem[], etp: EtpUst | null, contrato: TfsContrato | null, fin: Financeiro | null = null): Verificacao[] {
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
  const temCamposFin = itens.some((i) => i.faturado !== undefined);
  const executadas = itens.filter((i) => ehTarefaXvia(i) && i.estado === "Done");
  lista.push(
    { rotulo: "Tarefas da X-VIA concluídas sem o campo Faturado", itens: temCamposFin ? executadas.filter((i) => !i.faturado) : [], nota: temCamposFin ? undefined : "Campo ainda não extraído do TFS." },
    { rotulo: "Tarefas da X-VIA concluídas sem órgão identificado", itens: executadas.filter((i) => !i.orgao) },
    { rotulo: "Entregas com órgão só pelo prefixo da Feature (campo Órgãos/Secretarias vazio)", itens: itens.filter((i) => ehEntrega(i) && aberto(i) && i.orgaoOrigem === "feature") },
  );
  // Separação das frentes (ADR-017): nada daqui entra nos totais da X-VIA até ser resolvido.
  lista.push(
    { rotulo: "Tarefas sem frente identificada (sem contrato e fora da área que a X-VIA fatura): fora dos totais", itens: itens.filter((i) => i.frente === NAO_IDENTIFICADO && i.estado !== "Removed") },
    { rotulo: "Tarefas com contrato da X-VIA e responsável do time SGD: contam como X-VIA; conferir o contrato marcado", itens: itens.filter((i) => ehTarefaXvia(i) && i.timeSgd) },
    { rotulo: "Entregas contadas como X-VIA com responsável do time SGD: conferir se falta [SGD] no título ou a área XVIA\\SGD", itens: itens.filter((i) => ehEntrega(i) && aberto(i) && i.frente === "X-VIA" && i.timeSgd) },
  );
  const somaOrgaos = consumoPorOrgao(itens, etp, contrato).reduce((s, l) => s + l.ustExecutada, 0);
  if (somaOrgaos !== x.ustExecutada)
    lista.push({ rotulo: "UST executada total diferente da soma por órgão", itens: [], nota: `Total ${fmtNum(x.ustExecutada)} × soma por órgão ${fmtNum(somaOrgaos)}.` });
  for (const d of recorteFinanceiro(fin).divergencias) lista.push({ rotulo: "Divergência na cadeia financeira", itens: [], nota: d });
  if (aConciliar) lista.push({ rotulo: "Início do contrato a conciliar", itens: [], nota: "As fontes divergem; ver contrato.json → inicio.opcoes." });
  return lista;
}

// --- Veredito do Secretário: uma frase + 3 sinais ----------------------------
// Cada sinal compara com uma base (prazo, previsto no TR) e diz se é bom ou ruim.
// Régua das entregas = ritmo() de lancar-demandas-xvia/src/painel.py (BI e painel do TFS iguais).

export type Tom = "ok" | "atencao" | "critico" | "info" | "neutro";
export const PALAVRA_TOM: Record<Tom, string> = { ok: "no ritmo", atencao: "atenção", critico: "abaixo do esperado", info: "recorte", neutro: "sem dado" };
export type Sinal = {
  id: "entregas" | "execucao" | "decisoes";
  rotulo: string;
  tom: Tom;
  palavra: string;
  principal: string;
  comparacao: string;
  barras?: { rotulo: string; pct: number }[];
  acao?: { texto: string; aba: string };
  origem: Origem;
};

/** razão entregue/prazo: ≥ 0,9 no ritmo · ≥ 0,7 atenção · senão abaixo (painel.py:ritmo). */
export const tomEntregas = (pctEntregas: number, pctPrazo: number): Tom =>
  pctPrazo <= 0 ? "ok" : pctEntregas / pctPrazo >= 0.9 ? "ok" : pctEntregas / pctPrazo >= 0.7 ? "atencao" : "critico";
/** executado/previsto: ≥ 0,8 ok · ≥ 0,5 atenção · senão crítico. */
export const tomExecucao = (executado: number, previsto: number | null): Tom =>
  !previsto ? "info" : executado / previsto >= 0.8 ? "ok" : executado / previsto >= 0.5 ? "atencao" : "critico";
/** nenhuma parada = ok; alguma há mais de 30 dias = crítico; senão atenção. */
export const tomDecisoes = (paradas: TfsItem[]): Tom =>
  !paradas.length ? "ok" : paradas.some((p) => (p.diasSemAtualizar ?? 0) > 30) ? "critico" : "atencao";

const ORDEM_TOM: Tom[] = ["critico", "atencao", "info", "ok", "neutro"];

export function vereditoExecutivo(a: {
  prazo: { pctDecorrido: number; diasRestantes: number; fim: string; inicio: string };
  andamento: ReturnType<typeof andamentoEntregas>;
  consumo: ReturnType<typeof consumoContrato>;
  paradas: TfsItem[];
  atrasadas: TfsItem[];
  recorte: boolean;
  semPagamento: boolean;
}): { frase: string; tom: Tom; sinais: Sinal[] } {
  const { prazo, andamento, consumo, paradas, recorte } = a;
  const decidir = paradas.filter((p) => p.coluna === "Aguardando decisão");
  const previsto = recorte ? null : consumo.previstoAteMes;
  const pctPrevisto = previsto ? Math.round((consumo.ustExecutada / previsto) * 100) : null;

  const tEnt = tomEntregas(andamento.pct, prazo.pctDecorrido);
  const tExe = tomExecucao(consumo.ustExecutada, previsto);
  const tDec = tomDecisoes(paradas);
  const reais = consumo.valorExecutado === null ? "" : ` · ${fmtReais(consumo.valorExecutado)}`;

  const sinais: Sinal[] = [
    {
      id: "entregas", rotulo: "Entregas", tom: tEnt, palavra: PALAVRA_TOM[tEnt],
      principal: `${andamento.pct}% em produção`,
      comparacao: `${fmtNum(andamento.emProducao)} de ${fmtNum(andamento.planejadas)} entregas · ${prazo.pctDecorrido}% do prazo já passou (faltam ${fmtNum(prazo.diasRestantes)} dias)`,
      barras: [{ rotulo: "Em produção", pct: andamento.pct }, { rotulo: "Prazo decorrido", pct: prazo.pctDecorrido }],
      acao: { texto: "Ver cronograma", aba: "cronograma" },
      origem: andamento.origem,
    },
    {
      id: "execucao", rotulo: "Execução do contrato", tom: tExe, palavra: PALAVRA_TOM[tExe],
      principal: `${fmtNum(consumo.ustExecutada)} UST${recorte ? " neste recorte" : ""}`,
      comparacao: previsto
        ? `${pctPrevisto}% das ${fmtNum(previsto)} previstas no TR até este mês${reais}`
        : `${recorte ? "recorte filtrado: sem comparação com o contrato inteiro" : "sem previsão do TR"}${reais}`,
      barras: previsto ? [{ rotulo: "Executado do previsto", pct: Math.min(100, pctPrevisto ?? 0) }] : undefined,
      acao: { texto: "Ver por órgão", aba: "financeiro" },
      origem: consumo.origem,
    },
    {
      id: "decisoes", rotulo: "Decisões e bloqueios", tom: tDec, palavra: tDec === "ok" ? "nada parado" : tDec === "critico" ? "parado há mais de 30 dias" : "atenção",
      principal: `${fmtNum(decidir.length)} esperam decisão`,
      comparacao: `${fmtNum(paradas.length)} entregas paradas (decisão, impedimento ou dependência) · ${fmtNum(a.atrasadas.length)} passaram da sprint ou do prazo`,
      acao: { texto: "Ver quem resolve", aba: "prioridades" },
      origem: {
        rotulo: "Entregas da X-VIA paradas",
        numero: `${fmtNum(paradas.length)} entregas paradas`,
        passos: [
          `${fmtNum(decidir.length)} na coluna Aguardando decisão`,
          `${fmtNum(paradas.filter((p) => p.coluna === "Impedido").length)} na coluna Impedido`,
          `${fmtNum(paradas.filter((p) => p.coluna !== "Aguardando decisão" && p.coluna !== "Impedido").length)} com a etiqueta Dependência`,
        ],
        fonte: "TFS: coluna do quadro e etiquetas das entregas da X-VIA",
        detalhe: "As mais paradas primeiro.",
        itens: paradas,
        agruparPor: "coluna",
      },
    },
  ];

  const parteEnt = tEnt === "ok" ? "Entregas no ritmo do prazo" : tEnt === "atencao" ? "Entregas um pouco atrás do prazo" : "Entregas atrasadas em relação ao prazo";
  const parteExe = recorte ? `execução de ${fmtNum(consumo.ustExecutada)} UST neste recorte`
    : tExe === "ok" ? "execução do contrato no previsto" : tExe === "atencao" ? "execução do contrato abaixo do previsto"
    : tExe === "critico" ? `execução do contrato bem abaixo do previsto (${pctPrevisto}%)` : "execução sem previsão para comparar";
  const parteDec = decidir.length ? `${fmtNum(decidir.length)} ${decidir.length === 1 ? "entrega espera" : "entregas esperam"} decisão` : paradas.length ? `${fmtNum(paradas.length)} entregas paradas` : "nenhuma entrega parada";
  const frase = `${parteEnt}; ${parteExe}; ${parteDec}.${a.semPagamento ? " Nenhum pagamento registrado ainda." : ""}`;
  const tom = ORDEM_TOM.find((t) => sinais.some((s) => s.tom === t)) ?? "neutro";
  return { frase, tom, sinais };
}

// --- Execução financeira por órgão e serviço --------------------------------
// Só a EXECUÇÃO tem fonte (Tasks da X-VIA concluídas no TFS). Aceite,
// faturamento e pagamento não têm fonte ainda: ficam null ("Não informado"),
// nunca estimados a partir da execução. Task sem órgão vai para a linha
// "Sem órgão identificado" — nada é repartido por suposição.

export const SEM_ORGAO = "Sem órgão identificado";

export type LinhaServico = { pbiId: number | null; servico: string; ustExecutada: number; valorConsumido: number | null; tarefas: TfsItem[] };
export type LinhaOrgao = {
  orgao: string;
  ustExecutada: number;
  valorConsumido: number | null;
  ustAceita: null;
  valorFaturado: null;
  valorPago: null;
  pendente: null;
  tarefasMarcadasFaturadas: number;
  servicos: LinhaServico[];
  tarefas: TfsItem[];
};

export function consumoPorOrgao(itens: TfsItem[], etp: EtpUst | null, contrato: TfsContrato | null): LinhaOrgao[] {
  const tabela = etp ? ustEtp(etp) : new Map<string, CodigoEtp>();
  const valorUst = contrato?.valorUst ?? null;
  const porId = new Map(itens.map((i) => [i.id, i]));
  const orgaos = new Map<string, LinhaOrgao>();
  for (const t of itens.filter(ehTarefaXvia)) {
    if (t.estado !== "Done") continue;
    const u = ustDaTarefa(t, tabela);
    if ("situacao" in u) continue; // a classificar: fora da soma, como no total (execucaoXvia)
    const ust = u.valor;
    const nome = t.orgao ?? SEM_ORGAO;
    const o = orgaos.get(nome) ?? {
      orgao: nome, ustExecutada: 0, valorConsumido: null, ustAceita: null, valorFaturado: null,
      valorPago: null, pendente: null, tarefasMarcadasFaturadas: 0, servicos: [], tarefas: [],
    };
    o.ustExecutada += ust;
    o.tarefas.push(t);
    if (t.faturado) o.tarefasMarcadasFaturadas += 1;
    let s = o.servicos.find((x) => x.pbiId === t.pbiId);
    if (!s) {
      s = { pbiId: t.pbiId, servico: (t.pbiId && porId.get(t.pbiId)?.titulo) || "Sem serviço (tarefa fora de PBI)", ustExecutada: 0, valorConsumido: null, tarefas: [] };
      o.servicos.push(s);
    }
    s.ustExecutada += ust;
    s.tarefas.push(t);
    orgaos.set(nome, o);
  }
  const linhas = [...orgaos.values()];
  for (const o of linhas) {
    o.valorConsumido = valorUst === null ? null : o.ustExecutada * valorUst;
    for (const s of o.servicos) s.valorConsumido = valorUst === null ? null : s.ustExecutada * valorUst;
    o.servicos.sort((a, b) => b.ustExecutada - a.ustExecutada);
  }
  return linhas.sort((a, b) => (a.orgao === SEM_ORGAO ? 1 : b.orgao === SEM_ORGAO ? -1 : b.ustExecutada - a.ustExecutada));
}

/** UST da X-VIA executada por mês (AAAA-MM), pela mesma regra do total. Data = fechamento da
 * Task (a X-VIA quase não preenche a Data da Execução; mesma regra do painel do TFS); sem ela,
 * a Data da Execução. Concluída sem data nenhuma fica fora e é contada em `semData`. */
export function executadoPorMes(itens: TfsItem[], etp: EtpUst | null) {
  const tabela = etp ? ustEtp(etp) : new Map<string, CodigoEtp>();
  const meses = new Map<string, { mes: string; ust: number; itens: TfsItem[] }>();
  let semData = 0;
  for (const t of itens.filter((i) => ehTarefaXvia(i) && i.estado === "Done")) {
    const u = ustDaTarefa(t, tabela);
    if ("situacao" in u) continue;
    const mes = (t.fechadoEm ?? t.dataExecucao)?.slice(0, 7);
    if (!mes) { semData += 1; continue; }
    const m = meses.get(mes) ?? { mes, ust: 0, itens: [] };
    m.ust += u.valor;
    m.itens.push(t);
    meses.set(mes, m);
  }
  return { meses: [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes)), semData };
}

// --- Cadeia financeira (financeiro.json, manual) ---------------------------
// OS → medição → nota fiscal → pagamento, mais glosas. Só X-VIA. Cada etapa tem
// fonte, data e status próprios: nenhuma é deduzida da anterior. Sem registro,
// o valor é null ("Não informado"). Ver docs/projeto-xvia/04-regras-negocio.md.

export type OrdemServico = { numero: string; data?: string | null; orgao: string; servico?: string | null; pbiIds?: number[]; ustPrevista: number; status: string; fonte: string };
export type Medicao = { id: string; os: string; periodo: string; ustExecutada: number; ustAceita?: number | null; dataAceite?: string | null; status: string; fonte: string };
export type NotaFiscal = { numero: string; medicoes: string[]; data?: string | null; valor: number; status: string; fonte: string };
export type Pagamento = { notaFiscal: string; data: string | null; valor: number; status: string; fonte: string };
export type Glosa = { medicao?: string | null; notaFiscal?: string | null; ust?: number | null; valor: number; motivo: string; data?: string | null; fonte: string };
export type Financeiro = {
  atualizadoEm?: string | null;
  ordensServico: OrdemServico[];
  medicoes: Medicao[];
  notasFiscais: NotaFiscal[];
  pagamentos: Pagamento[];
  glosas: Glosa[];
};

/** Situação do dado (prompt do painel, item 9). */
export type StatusDado = "confirmado" | "calculado" | "ausente" | "divergente";
export type ValorFonte = { valor: number | null; status: StatusDado; fonte: string };

const somar = <T>(lista: T[], f: (x: T) => number | null | undefined) => lista.reduce((s, x) => s + (f(x) ?? 0), 0);
const FIN = "financeiro.json (manual)";

/** Recorte da cadeia de um órgão (ou do projeto todo): segue as chaves OS → medição → NF →
 * pagamento. O que não liga a nada vira divergência, nunca é encaixado por suposição. */
export function recorteFinanceiro(fin: Financeiro | null, orgao?: string) {
  const f = fin ?? { ordensServico: [], medicoes: [], notasFiscais: [], pagamentos: [], glosas: [] };
  const os = orgao ? f.ordensServico.filter((o) => o.orgao === orgao) : f.ordensServico;
  const numerosOs = new Set(os.map((o) => o.numero));
  const medicoes = orgao ? f.medicoes.filter((m) => numerosOs.has(m.os)) : f.medicoes;
  const idsMed = new Set(medicoes.map((m) => m.id));
  const notas = (orgao ? f.notasFiscais.filter((n) => n.medicoes.some((m) => idsMed.has(m))) : f.notasFiscais).filter((n) => n.status !== "cancelada");
  const numerosNf = new Set(notas.map((n) => n.numero));
  const pagamentos = orgao ? f.pagamentos.filter((p) => numerosNf.has(p.notaFiscal)) : f.pagamentos;
  const glosas = orgao ? f.glosas.filter((g) => (!!g.medicao && idsMed.has(g.medicao)) || (!!g.notaFiscal && numerosNf.has(g.notaFiscal))) : f.glosas;
  const divergencias: string[] = [];
  if (!orgao) {
    const todasOs = new Set(f.ordensServico.map((o) => o.numero));
    const todasMed = new Set(f.medicoes.map((m) => m.id));
    const todasNf = new Set(f.notasFiscais.map((n) => n.numero));
    for (const m of f.medicoes) if (!todasOs.has(m.os)) divergencias.push(`Medição ${m.id} aponta a OS ${m.os}, que não está cadastrada.`);
    for (const n of f.notasFiscais) for (const m of n.medicoes) if (!todasMed.has(m)) divergencias.push(`Nota fiscal ${n.numero} aponta a medição ${m}, que não está cadastrada.`);
    for (const p of f.pagamentos) if (!todasNf.has(p.notaFiscal)) divergencias.push(`Pagamento de ${fmtReais(p.valor)} aponta a nota fiscal ${p.notaFiscal}, que não está cadastrada.`);
  }
  for (const m of medicoes) if ((m.ustAceita ?? 0) > m.ustExecutada) divergencias.push(`Medição ${m.id}: UST aceitas (${fmtNum(m.ustAceita ?? 0)}) maiores que as executadas (${fmtNum(m.ustExecutada)}).`);
  for (const n of notas) {
    const pago = somar(pagamentos.filter((p) => p.notaFiscal === n.numero && p.status === "pago"), (p) => p.valor);
    if (pago > n.valor + 0.005) divergencias.push(`Nota fiscal ${n.numero}: pago (${fmtReais(pago)}) maior que o valor da nota (${fmtReais(n.valor)}).`);
  }
  return { os, medicoes, notas, pagamentos, glosas, divergencias };
}

/** Os 8 indicadores da execução financeira (prompt, item 5), cada um com status e fonte.
 * `executado` vem do TFS (UST e R$ calculados); o resto, do financeiro.json. */
export function cadeiaFinanceira(fin: Financeiro | null, executado: { ust: number; valor: number | null }, orgao?: string) {
  const r = recorteFinanceiro(fin, orgao);
  const v = (temRegistro: boolean, valor: number, fonte: string): ValorFonte =>
    temRegistro ? { valor, status: r.divergencias.length ? "divergente" : "confirmado", fonte } : { valor: null, status: "ausente", fonte };
  const aceitas = r.medicoes.filter((m) => m.ustAceita != null);
  const pagos = r.pagamentos.filter((p) => p.status === "pago");
  const faturado = v(r.notas.length > 0, somar(r.notas, (n) => n.valor), `${FIN}: notas fiscais não canceladas`);
  const pago = v(pagos.length > 0, somar(pagos, (p) => p.valor), `${FIN}: pagamentos com status pago`);
  // Pendente só é calculável com faturado registrado; pago ausente com NF registrada = nada pago ainda.
  const pendente: ValorFonte = faturado.valor === null
    ? { valor: null, status: "ausente", fonte: "Depende das notas fiscais" }
    : { valor: faturado.valor - (pago.valor ?? 0), status: r.divergencias.length ? "divergente" : "calculado", fonte: "Faturado − pago" };
  return {
    ustPrevista: v(r.os.length > 0, somar(r.os, (o) => o.ustPrevista), `${FIN}: Ordens de Serviço`),
    ustExecutada: { valor: executado.ust, status: "calculado", fonte: "TFS: tarefas da X-VIA concluídas com código do catálogo" } as ValorFonte,
    ustAceita: v(aceitas.length > 0, somar(aceitas, (m) => m.ustAceita), `${FIN}: medições com UST aceitas`),
    valorConsumido: { valor: executado.valor, status: executado.valor === null ? "ausente" : "calculado", fonte: "UST executadas × valor da UST no contrato" } as ValorFonte,
    valorFaturado: faturado,
    valorPago: pago,
    valorPendente: pendente,
    valorGlosado: v(r.glosas.length > 0, somar(r.glosas, (g) => g.valor), `${FIN}: glosas`),
    recorte: r,
  };
}

/** Falhas apontadas pelo QA no desenvolvimento (Bugs da X-VIA abertos). NÃO são SLA: o TR 4.3.1
 * vale para o atendimento de problemas da plataforma, e esses bugs fazem parte do ciclo de
 * desenvolvimento e homologação (Fabio, 11/11/2026). Mostradas à parte, como qualidade. */
export function bugsDoQa(itens: TfsItem[]) {
  const abertos = itens.filter((i) => i.tipo === "Bug" && i.frente === "X-VIA" && aberto(i));
  const porModulo = new Map<string, number>();
  for (const b of abertos) porModulo.set(b.epico ?? "sem módulo", (porModulo.get(b.epico ?? "sem módulo") ?? 0) + 1);
  const modulos = [...porModulo].map(([modulo, n]) => ({ modulo, n })).sort((a, b) => b.n - a.n);
  const origem: Origem = {
    rotulo: "Falhas apontadas pelo QA ainda abertas",
    numero: `${fmtNum(abertos.length)} falhas do QA abertas`,
    passos: [
      `${fmtNum(abertos.length)} itens do tipo Bug da X-VIA, abertos no TFS`,
      `por módulo: ${modulos.map((m) => `${m.modulo} ${fmtNum(m.n)}`).join(" · ") || "nenhum"}`,
    ],
    fonte: "TFS: itens do tipo Bug (registrados pelo QA durante o desenvolvimento)",
    detalhe: "Não contam para o SLA do contrato: são falhas encontradas antes de a entrega ir para produção.",
    itens: abertos,
  };
  return { total: abertos.length, modulos, origem };
}

/** Fontes do acompanhamento do contrato — lista única (Qualidade dos dados e documentação). */
export const FONTES_CONTRATO = [
  { fonte: "TFS (backlog XVIA)", traz: "Entregas, tarefas, UST lançada e executada, órgão, sprint, dependências", como: "API, extração manual na rede do Governo" },
  { fonte: "contrato.json", traz: "Vigência, valores, UST contratada e previsão mensal (TR 3.3.3)", como: "Manual, do Termo de Referência" },
  { fonte: "etp-ust.json", traz: "UST prevista por atividade (memória de cálculo do ETP)", como: "Manual" },
  { fonte: "catalogo-ust-xvia.json", traz: "Valor de cada atividade no catálogo da X-VIA", como: "Manual, da tabela de atividades do SCP" },
  { fonte: "financeiro.json", traz: "Ordens de Serviço, medições, aceite, notas fiscais, pagamentos e glosas", como: "Manual; vazio até a fiscalização preencher" },
  { fonte: "Relatório de SLA da X-VIA", traz: "Cumprimento dos prazos de atendimento do TR 4.3.1 (contrato.json → ans.medicao)", como: "Não recebido; o contrato prevê relatórios periódicos" },
];

// --- Filtros do painel (ficam na URL) --------------------------------------

export type Filtros = { modulo: string; frente: string; orgao: string; sprint: string };
/** Recorte ativo: indicadores do recorte não se comparam com o previsto do contrato inteiro. */
export const temRecorte = (f: Filtros) => Object.values(f).some(Boolean);

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
