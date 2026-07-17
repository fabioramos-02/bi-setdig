/**
 * Demanda real por carta de serviço — cruza o inventário estático das cartas
 * (Postgres) com as visitas ao vivo do Matomo (Actions.getPageUrls, ADR-010).
 * Server-only (usado pelo Route Handler de /servicos).
 *
 * Chave do join = SLUG (2º segmento do path), não `(categoria, slug)`: a
 * mesma carta é alcançável por mais de uma categoria no site real (ex.
 * pagamento de IPVA inscrito em dívida ativa aparece tanto em
 * administracao-publica/ quanto em financas-e-impostos/) — casar por
 * categoria também perdia visitas silenciosamente (ADR-012). Slug é único
 * entre as cartas ativas (0 colisões medidas). Classificação de página
 * (serviço/órgão/notícia/…) delega a `lib/pagina-tipo.ts` — mesmo dicionário
 * usado no ranking de páginas.
 *
 * Só cartas ATIVAS entram; carta sem acesso registrado no período fica de
 * fora do ranking de visitas (não é "0 forçado" — é transparência: "só
 * cartas com acesso no período").
 */
import type { CartaRelacao, DemandaOrgao } from "../data.ts";
import { construirContexto, classificarPagina } from "../pagina-tipo.ts";

type MatomoRow = { label?: string; url?: string; nb_visits?: number };

const PORTAL_BASE = "https://www.ms.gov.br";

export function urlDaCarta(carta: Pick<CartaRelacao, "categoria" | "slug">): string {
  return `${PORTAL_BASE}/${carta.categoria}/${carta.slug}`;
}

export type CartaVisita = {
  titulo: string;
  orgaoSigla: string;
  setor: string | null;
  categoria: string;
  slug: string;
  visitas: number;
  url: string;
};
export type RankVisita = { rotulo: string; visitas: number };
/** Acessos a páginas que parecem serviço (2+ segmentos, fora de
 * órgão/workspace/notícias/busca) e não casaram com nenhuma carta do
 * inventário. `pct` é sobre o total de páginas que "parecem serviço"
 * (servico casado + não identificado) — home/notícia/órgão não entram no
 * denominador, não são "miss". */
export type NaoIdentificado = { visitas: number; pct: number };
export type ResultadoVisitas = {
  porCarta: CartaVisita[];
  porOrgao: RankVisita[];
  porCategoria: RankVisita[];
  porSetor: RankVisita[];
  naoIdentificado: NaoIdentificado;
};

const ranquear = (m: Map<string, number>): RankVisita[] =>
  [...m.entries()].map(([rotulo, visitas]) => ({ rotulo, visitas })).sort((a, b) => b.visitas - a.visitas);

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 10000) / 100 : 0);

export function joinVisitas(pageUrlsRaw: MatomoRow[], inventario: CartaRelacao[]): ResultadoVisitas {
  const ctx = construirContexto(inventario);

  const visitasPorSlug = new Map<string, number>();
  let naoIdentificadoVisitas = 0;
  let pareceServicoTotal = 0;

  for (const row of Array.isArray(pageUrlsRaw) ? pageUrlsRaw : []) {
    const url = row.url || row.label || "";
    const visitas = Number(row.nb_visits) || 0;
    const classificado = classificarPagina(url, ctx);

    if (classificado.tipo === "servico") {
      pareceServicoTotal += visitas;
      visitasPorSlug.set(classificado.slug!, (visitasPorSlug.get(classificado.slug!) ?? 0) + visitas);
    } else if (classificado.tipo === "outro") {
      pareceServicoTotal += visitas;
      naoIdentificadoVisitas += visitas;
    }
  }

  const porCarta: CartaVisita[] = [];
  const orgao = new Map<string, number>();
  const categoria = new Map<string, number>();
  const setor = new Map<string, number>();
  for (const [slug, visitas] of visitasPorSlug) {
    const c = ctx.cartasPorSlug.get(slug)!;
    porCarta.push({
      titulo: c.titulo,
      orgaoSigla: c.orgaoSigla,
      setor: c.setor ?? null,
      categoria: c.categoria!,
      slug: c.slug,
      visitas,
      url: urlDaCarta(c),
    });
    orgao.set(c.orgaoSigla, (orgao.get(c.orgaoSigla) ?? 0) + visitas);
    categoria.set(c.categoria!, (categoria.get(c.categoria!) ?? 0) + visitas);
    // Chave composta (setor + sigla do órgão) — 2 setores homônimos em órgãos
    // diferentes não devem ser somados juntos, e o rótulo já sai pronto pro
    // ranking (ex. "Financeiro — SEFAZ").
    if (c.setor) {
      const chaveSetor = `${c.setor} — ${c.orgaoSigla}`;
      setor.set(chaveSetor, (setor.get(chaveSetor) ?? 0) + visitas);
    }
  }

  porCarta.sort((a, b) => b.visitas - a.visitas);
  return {
    porCarta,
    porOrgao: ranquear(orgao),
    porCategoria: ranquear(categoria),
    porSetor: ranquear(setor),
    naoIdentificado: { visitas: naoIdentificadoVisitas, pct: pct(naoIdentificadoVisitas, pareceServicoTotal) },
  };
}

/**
 * Recalculo ao vivo de `datasets/matomo/v1/demanda-por-orgao.json` pro
 * intervalo exato (ADR-010) — mesmo shape do dataset estático, mesma fonte
 * (inventário de cartas via `classificarPagina`, ADR-012).
 */
export function demandaPorOrgao(pageUrlsRaw: MatomoRow[], inventario: CartaRelacao[]): DemandaOrgao[] {
  const ctx = construirContexto(inventario);
  const nomePorSigla = new Map(ctx.orgaos.map((o) => [o.sigla, o.nome]));

  const visitasPorSigla = new Map<string, number>();
  let total = 0;
  for (const row of Array.isArray(pageUrlsRaw) ? pageUrlsRaw : []) {
    const classificado = classificarPagina(row.url || row.label || "", ctx);
    if (classificado.tipo !== "servico" || !classificado.orgaoSigla) continue;
    const visitas = Number(row.nb_visits) || 0;
    visitasPorSigla.set(classificado.orgaoSigla, (visitasPorSigla.get(classificado.orgaoSigla) ?? 0) + visitas);
    total += visitas;
  }

  return [...visitasPorSigla.entries()]
    .map(([orgaoSigla, visitas]) => ({ orgaoSigla, orgao: nomePorSigla.get(orgaoSigla) ?? orgaoSigla, visitas, pct: pct(visitas, total) }))
    .sort((a, b) => b.visitas - a.visitas);
}

export type PontoSerie = Record<string, number | string>;

/**
 * Série temporal dos serviços em `nomes` (os top-5 do período): 1 linha por
 * bucket de tempo `{rotulo, [titulo]: visitas}`. `porPeriodo` = resposta do
 * Matomo getPageUrls com period=week/month&date=range (dict keyed by data).
 */
export function serieTemporal(
  porPeriodo: Record<string, MatomoRow[]>,
  inventario: CartaRelacao[],
  nomes: string[],
): PontoSerie[] {
  const ctx = construirContexto(inventario);
  const alvo = new Set(nomes);
  return Object.keys(porPeriodo)
    .sort()
    .map((rotulo) => {
      const linha: PontoSerie = { rotulo };
      for (const n of nomes) linha[n] = 0;
      for (const row of porPeriodo[rotulo] || []) {
        const classificado = classificarPagina(row.url || row.label || "", ctx);
        if (classificado.tipo === "servico" && alvo.has(classificado.nome)) {
          linha[classificado.nome] = (linha[classificado.nome] as number) + (Number(row.nb_visits) || 0);
        }
      }
      return linha;
    });
}
