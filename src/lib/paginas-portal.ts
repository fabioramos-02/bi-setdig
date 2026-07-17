import type { PaginaClassificada } from "./pagina-tipo.ts";

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

  const oQueAconteceu = `A página inicial concentrou ${Math.round(composicao.homePctDoTotal)}% de todo o tráfego do portal ${rotuloPeriodo} (${fmt(composicao.homeVisitas)} visitas).`;

  const oQueSignifica = `Entre as páginas mais acessadas, ${Math.round(composicao.acaoPct)}% das visitas foram a páginas de serviço — o restante (${Math.round(composicao.apoioPct)}%) foi a conteúdo institucional, notícia ou navegação de apoio.`;

  const [s1, s2] = servicosTop;
  const oportunidade = s1
    ? `Serviços como "${s1.nome}" (${fmt(s1.visitas)} visitas)${s2 ? ` e "${s2.nome}" (${fmt(s2.visitas)} visitas)` : ""} ainda exigem navegação a partir da página inicial. Avaliar atalhos diretos na página inicial para os serviços mais procurados pode encurtar o caminho até o cidadão encontrar o que precisa.`
    : "Ainda não há páginas de serviço identificadas entre as mais acessadas no período — sem oportunidade a apontar.";

  return { oQueAconteceu, oQueSignifica, oportunidade };
}
