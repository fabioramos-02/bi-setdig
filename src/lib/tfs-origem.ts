/**
 * Leitura executiva do "De onde vem?" dos 3 sinais do Secretário (Entregas, Execução,
 * Decisões): número em destaque com o achado, barra contra a referência, grupos que abrem
 * os itens e avisos do dado. Só acrescenta campos opcionais à `Origem` que
 * `vereditoExecutivo` já monta — a conta (passos), a fonte e os itens continuam os mesmos.
 * Funções puras; o modal só apresenta.
 */
import {
  COLUNA_PRODUCAO, ehEntrega, fmtNum, fmtReais, tomEntregas, tomExecucao,
  type GrupoOrigem, type Origem, type Sinal, type TfsItem, type Tom,
} from "./tfs.ts";
import type { andamentoEntregas, consumoContrato } from "./tfs.ts";

const pctDe = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const pct1 = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toLocaleString("pt-BR")}%` : "0%");
const entregasValidas = (itens: TfsItem[]) => itens.filter((i) => ehEntrega(i) && i.estado !== "Removed");
const emProducao = (i: TfsItem) => i.coluna === COLUNA_PRODUCAO;
const emHomologacao = (i: TfsItem) => i.tags.includes("Em Homologação") && !emProducao(i);
const plural = (n: number, um: string, varios: string) => `${fmtNum(n)} ${n === 1 ? um : varios}`;

// --- Entregas -----------------------------------------------------------------

export type EtapaEntrega = "producao" | "homologacao" | "andamento" | "aFazer";
export const ETAPAS: { etapa: EtapaEntrega; rotulo: string; tom: Tom }[] = [
  { etapa: "producao", rotulo: "Em produção", tom: "ok" },
  { etapa: "homologacao", rotulo: "Em homologação", tom: "info" },
  { etapa: "andamento", rotulo: "Em andamento", tom: "atencao" },
  { etapa: "aFazer", rotulo: "Ainda não iniciadas", tom: "neutro" },
];

export const etapaDaEntrega = (i: TfsItem): EtapaEntrega =>
  emProducao(i) ? "producao" : emHomologacao(i) ? "homologacao" : i.estado === "New" ? "aFazer" : "andamento";

export type LinhaModuloAndamento = { modulo: string; total: number; emProducao: number; pct: number; atrasadas: number; itens: TfsItem[] };

/** Etapa de cada entrega planejada e, por módulo, quanto já está em produção. */
export function andamentoPorModulo(itens: TfsItem[], atrasadas: TfsItem[]) {
  const entregas = entregasValidas(itens);
  const atraso = new Set(atrasadas.map((i) => i.id));
  const etapas: Record<EtapaEntrega, number> = { producao: 0, homologacao: 0, andamento: 0, aFazer: 0 };
  const mapa = new Map<string, LinhaModuloAndamento>();
  for (const i of entregas) {
    etapas[etapaDaEntrega(i)] += 1;
    const modulo = i.epico ?? "Sem módulo";
    const m = mapa.get(modulo) ?? { modulo, total: 0, emProducao: 0, pct: 0, atrasadas: 0, itens: [] };
    m.total += 1;
    if (emProducao(i)) {
      m.emProducao += 1;
      m.itens.push(i);
    }
    if (atraso.has(i.id)) m.atrasadas += 1;
    mapa.set(modulo, m);
  }
  const porModulo = [...mapa.values()]
    .map((m) => ({ ...m, pct: pctDe(m.emProducao, m.total) }))
    .sort((a, b) => b.total - a.total || a.modulo.localeCompare(b.modulo, "pt-BR"));
  return { total: entregas.length, etapas, porModulo };
}

/** O maior módulo e, se for outro, o mais adiantado (com 5+ entregas, para não premiar módulo de 1 item). */
export function achadoModulos(porModulo: LinhaModuloAndamento[]): string {
  const maior = porModulo[0];
  if (!maior) return "";
  const frase = `${maior.modulo}, o maior módulo, tem ${fmtNum(maior.emProducao)} de ${fmtNum(maior.total)} entregas em produção (${maior.pct}%).`;
  const melhor = porModulo.filter((m) => m.total >= 5).sort((a, b) => b.pct - a.pct || b.total - a.total)[0];
  return melhor && melhor.modulo !== maior.modulo && melhor.pct > maior.pct
    ? `${frase} O mais adiantado é ${melhor.modulo}, com ${melhor.pct}%.`
    : frase;
}

/** Ritmo pela mesma régua do sinal (tomEntregas), sem repetir o % que já está em destaque. */
export function achadoRitmo(pctEntregas: number, pctPrazo: number): string {
  const t = tomEntregas(pctEntregas, pctPrazo);
  const ritmo = t === "ok" ? "as entregas acompanham o tempo" : t === "atencao" ? "as entregas estão um pouco atrás do tempo" : "as entregas estão bem atrás do tempo";
  return `Com ${pctPrazo}% do prazo já decorrido, ${ritmo}.`;
}

function origemEntregas(base: Origem, itens: TfsItem[], atrasadas: TfsItem[], pctPrazo: number, diasRestantes: number): Origem {
  const r = andamentoPorModulo(itens, atrasadas);
  const pct = pctDe(r.etapas.producao, r.total);
  const lista: GrupoOrigem[] = r.porModulo.map((m, i) => ({
    chave: m.modulo,
    nome: m.modulo,
    valor: `${m.pct}%`,
    barra: m.pct,
    legenda: `${fmtNum(m.emProducao)} de ${fmtNum(m.total)} em produção${m.atrasadas ? ` · ${plural(m.atrasadas, "atrasada", "atrasadas")}` : ""}`,
    tom: "ok",
    destaque: i === 0,
    itens: m.itens,
    vazio: "Nenhuma entrega deste módulo está em produção ainda.",
  }));
  return {
    ...base,
    rotulo: "De onde vem o andamento das entregas?",
    passos: base.passos?.slice(0, 2), // o resultado (÷ = %) já está em destaque
    destaque: { rotulo: "Entregas em produção", valor: `${pct}%`, icone: "rocket_launch", tom: tomEntregas(pct, pctPrazo), achado: `${achadoRitmo(pct, pctPrazo)} ${achadoModulos(r.porModulo)}` },
    barra: {
      esquerda: `Onde estão as ${fmtNum(r.total)} entregas planejadas`,
      direita: `faltam ${fmtNum(diasRestantes)} dias de contrato`,
      total: r.total,
      legenda: true,
      segmentos: ETAPAS.map((e) => ({ valor: r.etapas[e.etapa], tom: e.tom, rotulo: e.rotulo })),
      marcador: { pct: pctPrazo, rotulo: `${pctPrazo}% do prazo decorrido`, tom: "critico" },
    },
    grupos: { titulo: "Quais módulos estão mais adiantados?", dica: "Toque em um módulo para ver as entregas dele que já estão em produção.", lista },
    avisos: atrasadas.length
      ? [{ texto: `${plural(atrasadas.length, "entrega passou", "entregas passaram")} da sprint ou do prazo previsto e ainda não ${atrasadas.length === 1 ? "foi concluída" : "foram concluídas"}. Cada entrega conta igual, pequena ou grande.` }]
      : [{ texto: "Cada entrega conta igual, pequena ou grande." }],
  };
}

// --- Execução do contrato -----------------------------------------------------

function origemExecucao(consumo: ReturnType<typeof consumoContrato>, valorUst: number | null, previsto: number | null, mes: number): Origem {
  const base = consumo.origem;
  const total = consumo.ustExecutada;
  const linhas = consumo.porCodigo.filter((l) => l.executada > 0).sort((a, b) => b.executada - a.executada || a.codigo.localeCompare(b.codigo));
  const maior = linhas[0]?.executada || 1;
  const lista: GrupoOrigem[] = linhas.map((l, i) => {
    const feitas = l.itens.filter((t) => t.estado === "Done").sort((a, b) => (b.fechadoEm ?? "").localeCompare(a.fechadoEm ?? "") || a.id - b.id);
    return {
      chave: l.codigo,
      etiqueta: l.codigo,
      nome: l.servico,
      valor: valorUst === null ? `${fmtNum(l.executada)} UST` : fmtReais(l.executada * valorUst),
      barra: (l.executada / maior) * 100,
      legenda: `${pct1(l.executada, total)} · ${plural(feitas.length, "tarefa", "tarefas")} · ${fmtNum(l.executada)} UST`,
      tom: "info",
      destaque: i === 0,
      itens: feitas,
    };
  });
  const lider = linhas[0];
  const pLider = lider ? pctDe(lider.executada, total) : 0;
  const achado = !lider ? undefined : pLider === 100 ? `Todo o valor veio de ${lider.servico} (${lider.codigo}).` : `${lider.servico} (${lider.codigo}) responde por ${pLider}% desse valor.`;
  const foraDaSoma = consumo.aClassificar.filter((t) => t.estado === "Done").length;
  const n = base.itens?.length ?? 0;
  return {
    ...base,
    rotulo: "De onde vem o valor executado?",
    passos: [
      `${plural(n, "tarefa", "tarefas")} da X-VIA ${n === 1 ? "concluída" : "concluídas"}, com atividade do catálogo`,
      `somam ${fmtNum(total)} UST (valor de cada atividade no catálogo da X-VIA)`,
      ...(valorUst !== null ? [`× ${fmtReais(valorUst)} por UST (TR 9.3)`] : []),
    ],
    destaque: {
      rotulo: "Valor executado até agora",
      valor: consumo.valorExecutado === null ? `${fmtNum(total)} UST` : fmtReais(consumo.valorExecutado),
      icone: "payments",
      tom: "ok",
      achado,
    },
    barra: previsto
      ? {
          esquerda: `${pctDe(total, previsto)}% das ${fmtNum(previsto)} UST previstas no TR até o mês ${mes}`,
          total: Math.max(previsto, total),
          segmentos: [{ valor: total, tom: tomExecucao(total, previsto), rotulo: "Executado" }],
        }
      : consumo.ustTotal
        ? { esquerda: `${pct1(total, consumo.ustTotal)} das ${fmtNum(consumo.ustTotal)} UST do contrato`, total: consumo.ustTotal, segmentos: [{ valor: total, tom: "ok", rotulo: "Executado" }] }
        : undefined,
    grupos: { titulo: "Em quais serviços o dinheiro foi usado?", dica: "Toque em um serviço para ver as tarefas concluídas nele.", lista },
    avisos: foraDaSoma
      ? [{ texto: `${plural(foraDaSoma, "tarefa concluída ficou", "tarefas concluídas ficaram")} fora da soma por não ter atividade do catálogo válida. Estão em Qualidade dos dados para a X-VIA corrigir.` }]
      : undefined,
  };
}

// --- Decisões e bloqueios -----------------------------------------------------

export type MotivoPendencia = "decisao" | "impedido" | "dependencia";
export const MOTIVOS: { motivo: MotivoPendencia; rotulo: string; descricao: string; tom: Tom }[] = [
  { motivo: "decisao", rotulo: "Aguardando decisão", descricao: "Precisam de uma decisão para seguir", tom: "critico" },
  { motivo: "impedido", rotulo: "Impedidas", descricao: "Travadas por um problema que alguém precisa resolver", tom: "atencao" },
  { motivo: "dependencia", rotulo: "Dependem de outra entrega ou órgão", descricao: "Esperam outra entrega ou o retorno de um órgão", tom: "info" },
];

/** A coluna do quadro vale primeiro; a etiqueta Dependência só quando a coluna não diz nada
 * (agrupar só pela coluna jogaria as dependências em "A fazer", "Em Desenvolvimento" etc.). */
export const motivoPendencia = (i: TfsItem): MotivoPendencia =>
  i.coluna === "Aguardando decisão" ? "decisao" : i.coluna === "Impedido" ? "impedido" : "dependencia";

export function decisoesPorMotivo(itens: TfsItem[], paradas: TfsItem[]) {
  const abertas = entregasValidas(itens).filter((i) => i.estado !== "Done").length;
  const porMotivo = MOTIVOS.map((m) => ({ ...m, itens: paradas.filter((i) => motivoPendencia(i) === m.motivo) }));
  const modulos = new Map<string, number>();
  for (const i of paradas) modulos.set(i.epico ?? "Sem módulo", (modulos.get(i.epico ?? "Sem módulo") ?? 0) + 1);
  const [modulo, n] = [...modulos].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  return {
    abertas,
    porMotivo,
    semResponsavel: paradas.filter((i) => i.responsavel === null).length,
    achado: paradas.length && n > 1 ? `${modulo} concentra ${fmtNum(n)} das ${fmtNum(paradas.length)} (${pctDe(n, paradas.length)}%).` : "",
  };
}

function origemDecisoes(base: Origem, tom: Tom, itens: TfsItem[], paradas: TfsItem[]): Origem {
  const r = decisoesPorMotivo(itens, paradas);
  const maior = Math.max(...r.porMotivo.map((m) => m.itens.length), 1);
  const lider = r.porMotivo.reduce((a, b) => (b.itens.length > a.itens.length ? b : a));
  return {
    ...base,
    rotulo: "De onde vem o que pede decisão?",
    destaque: { rotulo: "Entregas paradas à espera de alguém", valor: fmtNum(paradas.length), icone: "gavel", tom, achado: r.achado || undefined },
    barra: {
      esquerda: `${pctDe(paradas.length, r.abertas)}% das ${fmtNum(r.abertas)} entregas ainda abertas`,
      total: r.abertas,
      segmentos: r.porMotivo.map((m) => ({ valor: m.itens.length, tom: m.tom, rotulo: m.rotulo })),
    },
    grupos: {
      titulo: "Por que estão paradas e quem precisa agir?",
      dica: "Toque em um motivo para ver as entregas e quem resolve cada uma.",
      lista: r.porMotivo.map((m) => ({
        chave: m.motivo, nome: m.rotulo, valor: fmtNum(m.itens.length), barra: (m.itens.length / maior) * 100,
        legenda: m.descricao, tom: m.tom, destaque: m === lider && m.itens.length > 0, itens: m.itens, vazio: "Nenhuma entrega com este motivo.",
      })),
    },
    avisos: r.semResponsavel
      ? [{ texto: `${plural(r.semResponsavel, "entrega parada não tem", "entregas paradas não têm")} responsável no TFS: alguém precisa assumir.`, tom: "critico" }]
      : undefined,
  };
}

// --- Os 3 sinais ----------------------------------------------------------------

/** Acrescenta a leitura executiva ao "De onde vem?" de cada sinal do veredito. */
export function enriquecerVeredito<V extends { sinais: Sinal[] }>(v: V, ctx: {
  itens: TfsItem[]; // só a X-VIA
  prazo: { pctDecorrido: number; diasRestantes: number; mesDoContrato: number };
  andamento: ReturnType<typeof andamentoEntregas>;
  consumo: ReturnType<typeof consumoContrato>;
  paradas: TfsItem[];
  atrasadas: TfsItem[];
  valorUst: number | null;
  recorte: boolean;
}): V {
  const sinais = v.sinais.map((s): Sinal => {
    if (s.id === "entregas") return { ...s, origem: origemEntregas(s.origem, ctx.itens, ctx.atrasadas, ctx.prazo.pctDecorrido, ctx.prazo.diasRestantes) };
    if (s.id === "execucao")
      return { ...s, origem: origemExecucao(ctx.consumo, ctx.valorUst, ctx.recorte ? null : ctx.consumo.previstoAteMes, ctx.prazo.mesDoContrato) };
    return { ...s, origem: origemDecisoes(s.origem, s.tom, ctx.itens, ctx.paradas) };
  });
  return { ...v, sinais };
}
