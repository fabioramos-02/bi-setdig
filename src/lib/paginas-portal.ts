import type { PaginaClassificada } from "./pagina-tipo.ts";
import { labelCategoria } from "./servicos.ts";

/**
 * Leitura executiva das páginas mais acessadas — separa o que é serviço
 * (transação) do que é apoio/conteúdo (informação), e monta a narrativa
 * "o que aconteceu → o que significa → oportunidade" (ver AGENTS.md
 * "BI de gestão"). Composição de volumes agregados, não jornada por
 * visitante: Transitions foi removido do pipeline por instabilidade
 * (ADR-010) — nunca afirmar que um cidadão específico "não chegou" a um
 * serviço, só que o VOLUME de acesso a página de serviço é menor que o de
 * página inicial.
 */

type PaginaComVisitas = PaginaClassificada & { visitas: number };

export type ComposicaoPaginas = {
  homeVisitas: number;
  /** % sobre o total real do período (não sofre o truncamento do top-20). */
  homePctDoTotal: number;
  acaoVisitas: number;
  /** % entre as páginas mais acessadas (base truncada — top-20) — igual ao
   * padrão já usado por calcularInsightPagina antes de existir um total
   * real publicado (ver busca-total.json, mesma lacuna aqui documentada em
   * "fora de escopo" no ADR-012). */
  acaoPct: number;
  apoioPct: number;
};

/** `classificadas` já vem agregada por identidade (agruparPaginasClassificadas)
 * — soma por tipo, "servico" é ação, o resto é apoio/informação. */
export function calcularComposicaoPaginas(classificadas: PaginaComVisitas[], totalVisitasPeriodo: number): ComposicaoPaginas | null {
  if (classificadas.length === 0) return null;

  const home = classificadas.find((p) => p.tipo === "pagina-inicial");
  const homeVisitas = home?.visitas ?? 0;
  const totalListado = classificadas.reduce((acc, p) => acc + p.visitas, 0);
  const acaoVisitas = classificadas.filter((p) => p.tipo === "servico").reduce((acc, p) => acc + p.visitas, 0);

  return {
    homeVisitas,
    homePctDoTotal: totalVisitasPeriodo > 0 ? (homeVisitas / totalVisitasPeriodo) * 100 : 0,
    acaoVisitas,
    acaoPct: totalListado > 0 ? (acaoVisitas / totalListado) * 100 : 0,
    apoioPct: totalListado > 0 ? ((totalListado - acaoVisitas) / totalListado) * 100 : 0,
  };
}

export type ResumoPaginas = { oQueAconteceu: string; oQueSignifica: string; oportunidade: string };

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

/**
 * `servicosTop` já vem ordenado desc (agruparPaginasClassificadas filtrado
 * por tipo "servico") — usa os 2 primeiros pra tornar a oportunidade
 * concreta (nome real do serviço, não genérico).
 */
export function gerarResumoPaginas(composicao: ComposicaoPaginas, servicosTop: PaginaComVisitas[], rotuloPeriodo: string): ResumoPaginas | null {
  if (composicao.homeVisitas === 0 && composicao.acaoVisitas === 0) return null;

  const oQueAconteceu = `A página inicial concentrou ${Math.round(composicao.homePctDoTotal)}% dos acessos registrados ${rotuloPeriodo} (${fmt(composicao.homeVisitas)} visitas), mantendo-se como a principal porta de entrada do Portal Único.`;

  const oQueSignifica = `Entre as páginas analisadas, os acessos concentraram-se principalmente em conteúdo institucional, navegação e páginas de apoio (${Math.round(composicao.apoioPct)}%), enquanto as páginas de serviço responderam por ${Math.round(composicao.acaoPct)}% dos acessos.`;

  const topTemas = obterTemasMaisDemandados(servicosTop, 3).map(t => t.titulo.toLowerCase());
  const temasTexto = topTemas.length > 1 
    ? `${topTemas.slice(0, -1).join(", ")} e ${topTemas[topTemas.length - 1]}`
    : topTemas[0] ?? "diversos temas";

  const oportunidade = `Os serviços mais procurados foram relacionados a ${temasTexto}, indicando as principais demandas dos cidadãos no período. Dar maior visibilidade a esses serviços na página inicial pode facilitar sua localização e reduzir o tempo até o atendimento.`;

  return { oQueAconteceu, oQueSignifica, oportunidade };
}

export type TemaDemandado = { slug: string; titulo: string; icon: string; visitas: number };

const EMOJIS_CATEGORIA: Record<string, string> = {
  "transito": "🚗",
  "documentacao": "🪪",
  "tributacao": "💰",
  "habitacao": "🏠",
  "saude-e-cuidado": "⚕️",
  "seguranca": "🛡️",
  "educacao": "📚",
  "negocios": "💼",
  "agropecuaria": "🌾",
  "meio-ambiente": "🌳",
  "assistencia-social": "🤝",
  "cultura": "🎭",
  "esporte-e-lazer": "⚽",
  "turismo": "🗺️",
  "trabalho": "👷",
};

export function obterTemasMaisDemandados(servicosTop: PaginaComVisitas[], limite = 4): TemaDemandado[] {
  const map = new Map<string, number>();
  for (const s of servicosTop) {
    if (s.categoria) {
      map.set(s.categoria, (map.get(s.categoria) ?? 0) + s.visitas);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([slug, visitas]) => {
      return { 
        slug, 
        titulo: labelCategoria(slug), 
        icon: EMOJIS_CATEGORIA[slug] ?? "📌", 
        visitas 
      };
    });
}
