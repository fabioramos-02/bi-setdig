/** Preparação da fila de gestão. Não altera classificações ou indicadores contratuais. */
import { arestas, invertidas, pbisDoEpico, situacoes, ROTULO_SITUACAO, type Situacao } from "./cronograma.ts";
import { atrasadas, fmtData, pendencias, type Frente, type Origem, type TfsItem, type TfsSprint } from "./tfs.ts";
import { linhasPrioridades } from "./xvia-prioridades.ts";

export const ACAO_GESTAO = {
  decisao: { rotulo: "Decisão pendente", acao: "Confirmar a decisão necessária e encaminhá-la com o responsável no registro." },
  impedimento: { rotulo: "Impedimento", acao: "Identificar o impedimento e combinar o encaminhamento com o responsável no registro." },
  atraso: { rotulo: "Atraso no cronograma", acao: "Confirmar o trabalho restante e pactuar uma nova previsão de entrega." },
  inversao: { rotulo: "Rever dependência", acao: "Revisar a ordem das sprints das entregas relacionadas." },
  orgao: { rotulo: "Validação do órgão", acao: "Cobrar a validação e registrar o retorno do órgão." },
  risco: { rotulo: "Risco por dependência", acao: "Verificar a entrega predecessora antes de confirmar o planejamento." },
  replanejar: { rotulo: "Replanejar início", acao: "Confirmar a prioridade e recolocar o trabalho em uma sprint viável." },
  planejar: { rotulo: "Definir sprint", acao: "Definir se o trabalho deve entrar nas próximas sprints." },
  dependencia: { rotulo: "Dependência registrada", acao: "Confirmar a dependência e conferir o vínculo entre as entregas." },
  prazo: { rotulo: "Revisar prazo da entrega", acao: "Conferir o prazo ou a sprint vencida antes de replanejar ou concluir." },
  cobrar: { rotulo: "Espera por órgão, decisão ou impedimento", acao: "Confirmar o encaminhamento com o órgão ou com o responsável no registro." },
} as const;
export type AcaoGestao = keyof typeof ACAO_GESTAO;
export const ehAcaoGestao = (v: string | null): v is AcaoGestao => !!v && Object.hasOwn(ACAO_GESTAO, v);

export type ProblemaGestao = {
  item: TfsItem; tipo: AcaoGestao; situacao: string; motivo: string; acao: string;
  responsavel: string; tempo: string; sprint: string; prazo: string | null; fimSprint: string | null;
  seguintes: TfsItem[]; anteriores: TfsItem[]; squad: string | null;
};
const aberto = (p: TfsItem) => p.estado !== "Done" && p.estado !== "Removed";
const ordem = Object.keys(ACAO_GESTAO) as AcaoGestao[];

function motivo(p: TfsItem, tipo: AcaoGestao, sprint?: TfsSprint) {
  switch (tipo) {
    case "decisao": return "O registro informa que aguarda decisão; a decisão específica não está descrita nos dados publicados.";
    case "impedimento": return "O item está na coluna Impedido; a causa específica precisa ser confirmada no registro original.";
    case "atraso": return `A sprint prevista${sprint ? ` (${sprint.nome}) terminou em ${fmtData(sprint.fim)}` : " já terminou"} e o trabalho continua aberto.`;
    case "inversao": return "Uma predecessora está planejada para uma sprint posterior à entrega que depende dela.";
    case "orgao": return "A entrega está aguardando validação do órgão.";
    case "risco": return "O cronograma identifica risco pela situação ou pela sprint de uma entrega predecessora.";
    case "replanejar": return `A sprint${sprint ? ` ${sprint.nome} terminou em ${fmtData(sprint.fim)}` : " prevista terminou"} e o registro continua em ${p.coluna ?? "etapa não informada"}.`;
    case "planejar": return "O item aberto não está vinculado a uma sprint reconhecida no planejamento.";
    case "dependencia": return "Existe uma pendência de dependência no registro. A etiqueta, sozinha, não descreve o vínculo.";
    case "prazo": return p.prazo ? `O prazo registrado venceu em ${fmtData(p.prazo)}.` : "A entrega permanece aberta em uma sprint encerrada.";
    case "cobrar": return "O cronograma identifica espera por validação, decisão ou solução de impedimento.";
  }
}

export function prepararAcoesGerente(itens: TfsItem[], sprints: TfsSprint[], hoje: string) {
  const pbis = pbisDoEpico(itens, null);
  const ligacoes = arestas(pbis);
  const situacao = situacoes(pbis, sprints, ligacoes, hoje);
  const porId = new Map(pbis.map((p) => [p.id, p]));
  const paresInvertidos = invertidas(pbis, sprints, ligacoes).map(([a, b]) => ({ antes: porId.get(a)!, depois: porId.get(b)! }));
  const pendentes = pendencias(itens);
  const porSituacao = (s: Situacao) => pbis.filter((p) => situacao.get(p.id) === s);
  const grupos: Record<AcaoGestao, TfsItem[]> = {
    decisao: pendentes.filter((p) => p.coluna === "Aguardando decisão"),
    impedimento: pendentes.filter((p) => p.coluna === "Impedido"),
    atraso: porSituacao("atrasado"),
    inversao: [...new Map(paresInvertidos.flatMap((p) => [p.antes, p.depois]).filter(aberto).map((p) => [p.id, p])).values()],
    orgao: porSituacao("esperando").filter((p) => p.coluna === "Aguardando Validação do Órgão"),
    risco: porSituacao("risco"), replanejar: porSituacao("nao_iniciado"), planejar: porSituacao("sem_sprint"),
    dependencia: pendentes.filter((p) => p.coluna !== "Aguardando decisão" && p.coluna !== "Impedido"),
    prazo: atrasadas(itens, sprints, hoje),
    cobrar: porSituacao("esperando"),
  };
  for (const tipo of ordem) grupos[tipo] = grupos[tipo].filter((p) => aberto(p) && p.frente !== "Não identificado");
  const ids = Object.fromEntries(ordem.map((k) => [k, new Set(grupos[k].map((p) => p.id))])) as Record<AcaoGestao, Set<number>>;
  const filaAnterior = {
    "X-VIA": linhasPrioridades(itens.filter((p) => p.frente === "X-VIA"), sprints, hoje),
    SGD: linhasPrioridades(itens.filter((p) => p.frente === "SGD"), sprints, hoje),
  };
  const universo = [...new Map(ordem.flatMap((k) => grupos[k]).filter((p) => aberto(p) && p.frente !== "Não identificado").map((p) => [p.id, p])).values()];
  const problemas: ProblemaGestao[] = universo.map((item) => {
    const tipo = ordem.find((k) => ids[k].has(item.id))!;
    const anteriores = ligacoes.filter(([, b]) => b === item.id).map(([a]) => porId.get(a)!);
    const seguintes = ligacoes.filter(([a]) => a === item.id).map(([, b]) => porId.get(b)!).filter(aberto);
    const sprint = sprints.find((s) => s.sprint === item.sprint);
    const dias = item.diasSemAtualizar;
    return {
      item, tipo, situacao: situacao.has(item.id) ? ROTULO_SITUACAO[situacao.get(item.id)!] : item.coluna ?? item.estado,
      motivo: motivo(item, tipo, sprint), acao: ACAO_GESTAO[tipo].acao,
      responsavel: item.responsavel ?? "Não informado",
      tempo: dias == null ? "Última atualização não informada" : dias === 0 ? "Atualizado na data dos dados" : `${dias} ${dias === 1 ? "dia" : "dias"} sem atualização`,
      sprint: sprint?.nome ?? "Sprint não informada", prazo: item.prazo, fimSprint: sprint?.fim ?? null,
      seguintes, anteriores, squad: item.tags.find((t) => /^squad\b/i.test(t)) ?? null,
    };
  }).sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo) || (b.item.diasSemAtualizar ?? -1) - (a.item.diasSemAtualizar ?? -1) || a.item.id - b.item.id);
  return { problemas, grupos, ids, paresInvertidos, situacao, ligacoes, filaAnterior };
}
export type AcoesGerente = ReturnType<typeof prepararAcoesGerente>;

export function configurarFilaInicial(a: AcoesGerente, alvoId: number | null, frenteFiltro: string) {
  const alvo = a.problemas.find((p) => p.item.id === alvoId);
  const frente = (frenteFiltro || alvo?.item.frente || "X-VIA") as Frente;
  const lista = a.problemas.filter((p) => p.item.frente === frente);
  const indice = alvo ? lista.findIndex((p) => p.item.id === alvo.item.id) : -1;
  return { frente, todos: indice >= 0, pagina: indice >= 0 ? Math.floor(indice / 10) + 1 : 1 };
}

export function selecionarProblemas(a: AcoesGerente, frente: Frente | "", grupo: AcaoGestao | "" = "") {
  return a.problemas.filter((p) => (!frente || p.item.frente === frente) && (!grupo || a.ids[grupo].has(p.item.id)));
}
export function resumirFila(a: AcoesGerente, frente: Frente | "", grupo: AcaoGestao | "" = "") {
  const problemas = selecionarProblemas(a, frente, grupo);
  const grupos = (Object.keys(ACAO_GESTAO) as AcaoGestao[]).filter((k) => k !== "dependencia" && k !== "prazo" && k !== "cobrar").map((tipo) => ({
    tipo, rotulo: ACAO_GESTAO[tipo].rotulo, total: a.grupos[tipo].filter((p) => !frente || p.frente === frente).length,
  }));
  if (frente === "Não identificado") return { problemas, grupos, frase: "Os registros sem frente identificada precisam ser conferidos no Detalhamento. Eles não são atribuídos à fila da X-VIA ou da SGD.", escopo: "A frente do registro ainda não permite atribuir o trabalho à contratada ou à equipe do Estado." };
  return { problemas, grupos, frase: problemas.length ? `${problemas.length} registros ${frente ? `da ${frente}` : "nas duas frentes"} ${grupo ? `nesta consulta de ${ACAO_GESTAO[grupo].rotulo.toLowerCase()}` : "com encaminhamento a verificar"}.` : `Não há registros de ação ${frente ? `da ${frente}` : "nas duas frentes"} neste conjunto de filtros e critérios.`,
    escopo: "Inclui pendências, prazo vencido, riscos e falta de sprint. Os grupos podem compartilhar registros; não some as contagens.",
  };
}
export function origemAcao(a: AcoesGerente, grupo: AcaoGestao, frente: Frente | ""): Origem {
  const itens = a.grupos[grupo].filter((p) => !frente || p.frente === frente);
  return { rotulo: ACAO_GESTAO[grupo].rotulo, numero: `${itens.length} entregas`, itens, agruparPor: "epico",
    detalhe: grupo === "inversao" ? "Participantes abertos de ligações invertidas. Uma ligação pode ter dois participantes; o número de pares é apresentado separadamente." : "Entregas nos filtros aplicados que atendem a este critério. As listas podem compartilhar itens.",
    fonte: "Colunas, sprints e dependências cadastradas nos registros do projeto.",
  };
}

/** Contexto de consulta só da aba Entregas; não refiltra os indicadores contratuais. */
export function consultarEntregas(a: AcoesGerente, itens: TfsItem[], grupo: string | null) {
  return ehAcaoGestao(grupo) ? itens.filter((p) => a.ids[grupo].has(p.id)) : itens;
}
