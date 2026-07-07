import type { TermoBusca, Navegador, Dispositivo, Plataforma, Servico, EventoFunil, HorarioGa4 } from "./data";
import type { PeriodoTipo, PontoAgregado } from "./period-filter";

/**
 * Cálculos pra storytelling (StoryCard) — réplica do padrão de
 * bench-carta/src/ui/sections.py::story() (frase-âncora + números). Sem
 * lógica de UI aqui, só números; o componente decide como apresentar.
 */
export type InsightBusca = { termo: string; buscas: number; participacaoPct: number };

export function calcularInsightBusca(termos: TermoBusca[]): InsightBusca | null {
  if (termos.length === 0) return null;
  const total = termos.reduce((acc, t) => acc + t.buscas, 0);
  const top = termos[0];
  return { termo: top.termo, buscas: top.buscas, participacaoPct: total > 0 ? (top.buscas / total) * 100 : 0 };
}

/** Rótulos em português pro período atual/anterior, conforme o tipo de
 * filtro selecionado — usados na frase do StoryCard. */
const ROTULOS: Record<Exclude<PeriodoTipo, "intervalo">, { rotuloAtual: string; rotuloAnterior: string }> = {
  dia: { rotuloAtual: "Hoje", rotuloAnterior: "ontem" },
  semana: { rotuloAtual: "Esta semana", rotuloAnterior: "a semana passada" },
  mes: { rotuloAtual: "Este mês", rotuloAnterior: "o mês passado" },
  ano: { rotuloAtual: "Este ano", rotuloAnterior: "o ano passado" },
};

export type InsightVisitas = {
  variacaoPct: number | null;
  visitasAtual: number;
  visitasAnterior: number;
  rotuloAtual: string;
  rotuloAnterior: string;
};

/**
 * Compara o último ponto da série já agregada (`tendencia`, ver
 * period-filter.ts) com o ponto anterior — reage ao período escolhido no
 * filtro (dia vs ontem, mês vs mês passado, ano vs ano passado). Sem
 * comparação em "Intervalo de datas": não há um "período anterior" óbvio
 * pra um range arbitrário escolhido à mão.
 */
export function calcularInsightVisitas(tendencia: PontoAgregado[], tipo: PeriodoTipo): InsightVisitas | null {
  if (tipo === "intervalo" || tendencia.length < 2) return null;
  const atual = tendencia[tendencia.length - 1].visitas;
  const anterior = tendencia[tendencia.length - 2].visitas;
  const variacaoPct = anterior > 0 ? ((atual - anterior) / anterior) * 100 : null;
  return { variacaoPct, visitasAtual: atual, visitasAnterior: anterior, ...ROTULOS[tipo] };
}

export type InsightNavegador = { navegador: string; participacaoPct: number };

export function calcularInsightNavegador(navegadores: Navegador[]): InsightNavegador | null {
  if (navegadores.length === 0) return null;
  const total = navegadores.reduce((acc, n) => acc + n.visitas, 0);
  const top = [...navegadores].sort((a, b) => b.visitas - a.visitas)[0];
  return { navegador: top.navegador, participacaoPct: total > 0 ? (top.visitas / total) * 100 : 0 };
}

export type InsightDispositivo = { dispositivo: string; participacaoPct: number };

export function calcularInsightDispositivo(dispositivos: Dispositivo[]): InsightDispositivo | null {
  if (dispositivos.length === 0) return null;
  const total = dispositivos.reduce((acc, d) => acc + d.visitas, 0);
  const top = [...dispositivos].sort((a, b) => b.visitas - a.visitas)[0];
  return { dispositivo: top.dispositivo, participacaoPct: total > 0 ? (top.visitas / total) * 100 : 0 };
}

export type InsightPlataforma = { operatingSystem: string; participacaoPct: number };

export function calcularInsightPlataforma(plataformas: Plataforma[]): InsightPlataforma | null {
  if (plataformas.length === 0) return null;
  const total = plataformas.reduce((acc, p) => acc + p.activeUsers, 0);
  const top = [...plataformas].sort((a, b) => b.activeUsers - a.activeUsers)[0];
  return { operatingSystem: top.operatingSystem, participacaoPct: total > 0 ? (top.activeUsers / total) * 100 : 0 };
}

export type InsightServico = { servico: string; participacaoPct: number };

export function calcularInsightServico(servicos: Servico[]): InsightServico | null {
  if (servicos.length === 0) return null;
  const total = servicos.reduce((acc, s) => acc + s.acessos, 0);
  const top = [...servicos].sort((a, b) => b.acessos - a.acessos)[0];
  return { servico: top.servico, participacaoPct: total > 0 ? (top.acessos / total) * 100 : 0 };
}

export type InsightHorario = { horaPico: string; sessoesPico: number; participacaoPct: number };

/** Hora de pico de uso do app — molde de calcularInsightServico (acha o topo,
 * calcula % do total). Alimenta o StoryCard de horário na PerfilTab. */
export function calcularInsightHorario(horarios: HorarioGa4[]): InsightHorario | null {
  if (horarios.length === 0) return null;
  const total = horarios.reduce((acc, h) => acc + h.sessoes, 0);
  const top = [...horarios].sort((a, b) => b.sessoes - a.sessoes)[0];
  return { horaPico: top.hora, sessoesPico: top.sessoes, participacaoPct: total > 0 ? (top.sessoes / total) * 100 : 0 };
}

/** Rótulo de estágio pro funil de aquisição -> ativação -> navegação ->
 * retenção — porta de _EVENTOS_SISTEMA em views/ms_digital/tab4_jornada.py. */
const ROTULO_ESTAGIO: Record<string, string> = {
  first_open: "Aquisição (Downloads)",
  session_start: "Ativação (Sessão)",
  screen_view: "Navegação (Telas)",
  user_engagement: "Retenção (Engajamento)",
};

export function rotuloEstagioFunil(evento: string): string {
  return ROTULO_ESTAGIO[evento] ?? evento;
}

/** Interpretação fixa por transição — porta do bloco "Interpretando o
 * número" em views/ms_digital/tab4_jornada.py (o legado escolhia o texto
 * via if/elif na maior queda; aqui é a mesma escolha, só que como mapa). */
const INTERPRETACAO_QUEDA: Record<string, string> = {
  "first_open->session_start": "Baixam o app mas não chegam a abrir/logar de fato.",
  "session_start->screen_view": "Abrem o app mas não encontram o que precisam, ou acham a interface confusa.",
  "screen_view->user_engagement": "Usam o app pontualmente mas não criam hábito de retorno.",
};

export type InsightFunil = {
  estagioAtual: string;
  estagioProximo: string;
  quedaPct: number;
  usuariosPerdidos: number;
  interpretacao: string;
};

/** Acha a maior queda entre estágios consecutivos do funil — peça central
 * do storytelling do domínio (identifica onde o cidadão abandona o app). */
export function calcularInsightFunil(funil: EventoFunil[]): InsightFunil | null {
  if (funil.length < 2) return null;
  const quedas = funil.slice(0, -1).map((estagio, i) => {
    const proximo = funil[i + 1];
    const quedaPct = estagio.usuarios > 0 ? ((estagio.usuarios - proximo.usuarios) / estagio.usuarios) * 100 : 0;
    return {
      estagioAtual: estagio.evento,
      estagioProximo: proximo.evento,
      quedaPct,
      usuariosPerdidos: estagio.usuarios - proximo.usuarios,
    };
  });
  const maior = quedas.reduce((a, b) => (b.quedaPct > a.quedaPct ? b : a));
  const chave = `${maior.estagioAtual}->${maior.estagioProximo}`;
  return { ...maior, interpretacao: INTERPRETACAO_QUEDA[chave] ?? "Ponto de atenção — investigar contexto específico dessa transição." };
}
