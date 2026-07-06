import type { TermoBusca, VisitaDiaria, Navegador, Dispositivo } from "./data";

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

export type InsightVisitas = { mediaDiaria: number; ultimoDia: number; variacaoPct: number | null };

export function calcularInsightVisitas(diarias: VisitaDiaria[]): InsightVisitas {
  const ultimos30 = diarias.slice(-30);
  const mediaDiaria = ultimos30.length > 0 ? ultimos30.reduce((acc, d) => acc + d.visitas, 0) / ultimos30.length : 0;
  const ultimoDia = diarias.at(-1)?.visitas ?? 0;

  let variacaoPct: number | null = null;
  if (diarias.length >= 14) {
    const semanaAtual = diarias.slice(-7).reduce((acc, d) => acc + d.visitas, 0);
    const semanaAnterior = diarias.slice(-14, -7).reduce((acc, d) => acc + d.visitas, 0);
    variacaoPct = semanaAnterior > 0 ? ((semanaAtual - semanaAnterior) / semanaAnterior) * 100 : null;
  }

  return { mediaDiaria, ultimoDia, variacaoPct };
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
