import type { TermoBusca, Navegador, Dispositivo } from "./data";
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
