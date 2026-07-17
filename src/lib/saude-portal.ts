import type { VisitaDiaria } from "./data";
import { type PeriodoState, type PeriodoTipo, type ResumoPeriodo, agregarPor, intervaloDoBucket } from "./period-filter.ts";
import type { InsightVisitas, InsightBusca, InsightDispositivo } from "./insights";

/**
 * Composição dos insights de `insights.ts` em texto e diagnóstico pra
 * gestão (resumo executivo, saúde do portal, recomendações) — ver
 * AGENTS.md "BI de gestão, não de métrica". Arquivo separado de
 * insights.ts porque aqui é composição de várias peças, não 1
 * insight por função.
 */

// --- Saúde do portal ---------------------------------------------------

export type NivelSaude = "saudavel" | "atencao" | "critico";
export type SaudePortal = { nivel: NivelSaude; variacaoPct: number; frase: string };

const JANELA_HISTORICO: Record<Exclude<PeriodoTipo, "intervalo">, number> = {
  dia: 8,
  semana: 8,
  mes: 12,
  ano: 30, // teto alto — na prática limitado pelo quanto de histórico existe
};

const ROTULO_BUCKET: Record<Exclude<PeriodoTipo, "intervalo">, string> = {
  dia: "hoje",
  semana: "esta semana",
  mes: "este mês",
  ano: "este ano",
};

const ROTULO_JANELA: Record<Exclude<PeriodoTipo, "intervalo">, string> = {
  dia: "das últimas 8 vezes nesse dia da semana",
  semana: "das últimas 8 semanas",
  mes: "dos últimos 12 meses",
  ano: "dos anos anteriores",
};

function deslocarDias(dataISO: string, dias: number): string {
  const d = new Date(dataISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function deslocarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDiaDoMes = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimoDiaDoMes));
  return d.toISOString().slice(0, 10);
}

function deslocarAnos(dataISO: string, anos: number): string {
  return deslocarMeses(dataISO, anos * 12);
}

function mediaDiaria(dados: VisitaDiaria[], inicio: string, fim: string): number | null {
  const doPeriodo = dados.filter((d) => d.data >= inicio && d.data <= fim);
  if (doPeriodo.length === 0) return null;
  const soma = doPeriodo.reduce((acc, d) => acc + d.visitas, 0);
  return soma / doPeriodo.length;
}

function mediana(valores: number[]): number {
  const ord = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  return ord.length % 2 === 0 ? (ord[meio - 1] + ord[meio]) / 2 : ord[meio];
}

/**
 * Compara a média diária de visitas do período selecionado com a mediana da
 * mesma granularidade nos períodos anteriores (mesmo dia-da-semana pra "dia",
 * 8 semanas/12 meses/anos anteriores pra semana/mês/ano) — mediana em vez de
 * média pra não deixar um pico isolado (ex. campanha de IPVA) distorcer o
 * "típico". `null` quando não há comparação honesta: "intervalo" (sem período
 * equivalente óbvio pra um range arbitrário) ou menos de 3 buckets
 * históricos disponíveis.
 */
export function calcularSaude(diarias: VisitaDiaria[], estado: PeriodoState, min: string, max: string): SaudePortal | null {
  if (estado.tipo === "intervalo") return null;
  const tipo = estado.tipo;

  const atualRange = intervaloDoBucket(estado, min, max);
  const atualMedia = mediaDiaria(diarias, atualRange.inicio, atualRange.fim);
  if (atualMedia === null) return null;

  const historicas: number[] = [];
  const janela = JANELA_HISTORICO[tipo];
  for (let i = 1; i <= janela; i++) {
    const dataRefAnterior =
      tipo === "mes"
        ? deslocarMeses(estado.dataRef, -i)
        : tipo === "ano"
          ? deslocarAnos(estado.dataRef, -i)
          : deslocarDias(estado.dataRef, -7 * i); // dia e semana: mesmo dia-da-semana, 1 semana antes por passo
    const range = intervaloDoBucket({ tipo, dataRef: dataRefAnterior }, min, max);
    if (range.fim >= atualRange.inicio) continue; // nunca sobrepõe o bucket atual
    const media = mediaDiaria(diarias, range.inicio, range.fim);
    if (media !== null) historicas.push(media);
  }

  if (historicas.length < 3) return null;
  const medianaHistorica = mediana(historicas);
  if (medianaHistorica <= 0) return null;

  const variacaoPct = ((atualMedia - medianaHistorica) / medianaHistorica) * 100;
  const nivel: NivelSaude = variacaoPct >= -10 ? "saudavel" : variacaoPct >= -30 ? "atencao" : "critico";
  const rotuloBucket = ROTULO_BUCKET[tipo];
  const rotuloJanela = ROTULO_JANELA[tipo];
  const frase =
    nivel === "saudavel"
      ? `As visitas ${rotuloBucket} estão no ritmo típico ${rotuloJanela}.`
      : `As visitas ${rotuloBucket} estão ${Math.abs(Math.round(variacaoPct))}% abaixo do ritmo típico ${rotuloJanela}.`;

  return { nivel, variacaoPct, frase };
}

// --- Contexto anual (sazonalidade) --------------------------------------

export type ContextoAnual = { variacaoAnualPct: number | null; melhorMes: string; piorMes: string; frase: string };

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2025-07" → "julho de 2025". O ano não é opcional: os últimos 12 meses
 * cruzam a virada do ano, então "julho" sozinho é ambíguo — chega a parecer
 * contradição ("julho foi o mês de mais acesso" enquanto julho corrente
 * mostra queda, porque o julho citado era o do ano anterior). */
function nomeMes(rotuloMes: string): string {
  const mes = MESES_PT[Number(rotuloMes.slice(5, 7)) - 1];
  return mes ? `${mes} de ${rotuloMes.slice(0, 4)}` : rotuloMes;
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Compara o último mês completo com o mesmo mês do ano anterior, e aponta o
 * melhor/pior mês dos últimos 12 — sempre sobre a série completa
 * (independe do filtro selecionado; contexto anual é sempre anual).
 */
export function calcularContextoAnual(diarias: VisitaDiaria[]): ContextoAnual | null {
  const mensal = agregarPor(diarias, "mes");
  if (mensal.length < 2) return null;

  // O último ponto pode ser um mês corrente incompleto — descarta pra não
  // comparar mês parcial com mês fechado.
  const completos = mensal.slice(0, -1);
  if (completos.length === 0) return null;

  const ultimo = completos[completos.length - 1];
  const rotuloAnoAnterior = `${Number(ultimo.rotulo.slice(0, 4)) - 1}-${ultimo.rotulo.slice(5, 7)}`;
  const mesmoMesAnoAnterior = completos.find((p) => p.rotulo === rotuloAnoAnterior);
  const variacaoAnualPct =
    mesmoMesAnoAnterior && mesmoMesAnoAnterior.visitas > 0
      ? ((ultimo.visitas - mesmoMesAnoAnterior.visitas) / mesmoMesAnoAnterior.visitas) * 100
      : null;

  const ultimos12 = completos.slice(-12);
  const melhor = ultimos12.reduce((a, b) => (b.visitas > a.visitas ? b : a));
  const pior = ultimos12.reduce((a, b) => (b.visitas < a.visitas ? b : a));

  const fraseYoY =
    variacaoAnualPct !== null
      ? `${capitalizar(nomeMes(ultimo.rotulo))} teve ${Math.abs(Math.round(variacaoAnualPct))}% ${variacaoAnualPct >= 0 ? "mais" : "menos"} visitas que o mesmo mês do ano passado`
      : null;
  const frasePicoVale = `${capitalizar(nomeMes(melhor.rotulo))} foi o mês de mais acesso nos últimos 12 meses, e ${nomeMes(pior.rotulo)} o de menos`;
  const frase = fraseYoY ? `${fraseYoY}. ${frasePicoVale}.` : `${frasePicoVale}.`;

  return { variacaoAnualPct, melhorMes: nomeMes(melhor.rotulo), piorMes: nomeMes(pior.rotulo), frase };
}

// --- Profundidade de navegação -------------------------------------------

export type Navegacao = { paginasPorVisita: number; variacaoAnualPct: number | null };

/**
 * Quantas páginas o cidadão vê por visita — responde "ele encontrou o que
 * queria, ou entrou e saiu?", que o total cru de ações (nb_actions do Matomo)
 * não responde: 683 mil ações não diz nada sozinho, 2,1 páginas por visita
 * diz (ver AGENTS.md "BI de gestão"). `variacaoAnualPct` compara com o mesmo
 * período 12 meses antes, pra o número não andar sozinho.
 */
export function calcularNavegacao(kpis: ResumoPeriodo, diarias: VisitaDiaria[], estado: PeriodoState, min: string, max: string): Navegacao | null {
  if (kpis.visitas <= 0) return null;
  const paginasPorVisita = kpis.acoes / kpis.visitas;

  let variacaoAnualPct: number | null = null;
  if (estado.tipo !== "intervalo") {
    const rangeAnoAnterior = intervaloDoBucket({ tipo: estado.tipo, dataRef: deslocarAnos(estado.dataRef, -1) }, min, max);
    const doAnoAnterior = diarias.filter((d) => d.data >= rangeAnoAnterior.inicio && d.data <= rangeAnoAnterior.fim);
    const visitasAnt = doAnoAnterior.reduce((acc, d) => acc + d.visitas, 0);
    const acoesAnt = doAnoAnterior.reduce((acc, d) => acc + d.acoes, 0);
    if (visitasAnt > 0) {
      const anterior = acoesAnt / visitasAnt;
      if (anterior > 0) variacaoAnualPct = ((paginasPorVisita - anterior) / anterior) * 100;
    }
  }

  return { paginasPorVisita, variacaoAnualPct };
}

// --- Resumo executivo -----------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** 3-4 frases prontas pro topo da Visão Geral — pula peça indisponível
 * (`null`), some inteiro se sobrarem menos de 2 frases (nunca resumo pela
 * metade fingindo estar completo). */
export function gerarResumoExecutivo(p: {
  kpis: ResumoPeriodo;
  rotuloPeriodo: string;
  saude: SaudePortal | null;
  insightVisitas: InsightVisitas | null;
  insightBusca: InsightBusca | null;
  navegacao: Navegacao | null;
  municipiosComAcesso: number;
  totalMunicipios: number;
}): string | null {
  const frases: string[] = [`O portal registrou ${fmt(p.kpis.visitas)} visitas ${p.rotuloPeriodo}.`];

  if (p.saude) {
    frases.push(p.saude.frase);
  } else if (p.insightVisitas && p.insightVisitas.variacaoPct !== null) {
    const v = p.insightVisitas;
    frases.push(
      `Foram ${Math.abs(Math.round(v.variacaoPct!))}% ${v.variacaoPct! >= 0 ? "a mais" : "a menos"} de visitas do que ${v.rotuloAnterior}.`,
    );
  }

  if (p.insightBusca) frases.push(`O assunto mais buscado foi "${p.insightBusca.termo}".`);

  frases.push(`O portal alcançou cidadãos de ${p.municipiosComAcesso} dos ${p.totalMunicipios} municípios de MS.`);

  // Acesso não é valor entregue: a profundidade de navegação é a pista mais
  // próxima que este dado dá de "o cidadão achou o que procurava".
  if (p.navegacao) {
    frases.push(
      `Em média, cada visita passou por ${p.navegacao.paginasPorVisita.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} páginas antes de sair.`,
    );
  }

  return frases.length >= 2 ? frases.join(" ") : null;
}

// --- Recomendações ----------------------------------------------------

export type Recomendacao = { texto: string; abaId?: string };

/** Bullets acionáveis, risco antes de oportunidade, teto de 4 — sem nada
 * aplicável, devolve lista vazia (a UI omite a seção; nunca bullet de
 * enchimento, ver AGENTS.md). */
export function gerarRecomendacoes(p: {
  saude: SaudePortal | null;
  insightDispositivo: InsightDispositivo | null;
  insightBusca: InsightBusca | null;
  municipiosSemAcesso: string[];
}): Recomendacao[] {
  const out: Recomendacao[] = [];

  if (p.saude && p.saude.nivel !== "saudavel") {
    out.push({ texto: `Investigar a queda nas visitas antes de planejar novas ações: ${p.saude.frase.toLowerCase()}` });
  }

  if (p.municipiosSemAcesso.length > 0) {
    out.push({
      texto: `${p.municipiosSemAcesso.length} municípios não registraram acesso no período — avaliar divulgação regional.`,
    });
  }

  if (p.insightDispositivo?.dispositivo.toLowerCase().includes("smartphone") && p.insightDispositivo.participacaoPct >= 70) {
    out.push({ texto: "A maior parte do acesso é pelo celular — priorizar a experiência no celular em qualquer melhoria do portal." });
  }

  if (p.insightBusca && p.insightBusca.participacaoPct >= 20) {
    out.push({
      texto: `"${p.insightBusca.termo}" concentra boa parte das buscas — vale dar destaque a esse serviço na página inicial.`,
      abaId: "busca",
    });
  }

  return out.slice(0, 4);
}
