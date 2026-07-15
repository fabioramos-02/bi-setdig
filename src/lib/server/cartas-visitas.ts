/**
 * Demanda real por carta de serviço — cruza o inventário estático das cartas
 * (Postgres) com as visitas ao vivo do Matomo (Actions.getPageUrls, ADR-010).
 * Server-only (usado pelo Route Handler de /servicos).
 *
 * Chave do join = 2 primeiros segmentos do path do Matomo `(categoria, slug)`,
 * match exato normalizado — mesmo padrão de
 * matomo/matomo-analytics-dashboard/utils/data_processor.py::identify_service_cards.
 * Só cartas ATIVAS entram; carta sem acesso registrado no período fica de fora
 * do ranking de visitas (não é "0 forçado" — é transparência: "só cartas com
 * acesso no período").
 */
import type { CartaRelacao } from "@/lib/data";

type MatomoRow = { label?: string; url?: string; nb_visits?: number };

const PORTAL_BASE = "https://www.ms.gov.br";

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** `(categoria, slug)` dos 2 primeiros segmentos do path — null se não parece
 * página de serviço (home, /noticias sem 2º segmento, etc.). */
function chaveDoPath(url: string): string | null {
  const semQuery = (url || "").split(/[?#]/)[0];
  const semHost = semQuery.replace(/^https?:\/\/[^/]+/, "");
  const partes = semHost.split("/").filter(Boolean);
  if (partes.length < 2) return null;
  return `${normalizar(partes[0])}/${normalizar(partes[1])}`;
}

/** Mapa `(categoria/slug normalizado) -> carta ativa`. */
function mapaDeCartas(inventario: CartaRelacao[]): Map<string, CartaRelacao> {
  const mapa = new Map<string, CartaRelacao>();
  for (const c of inventario) {
    if (!c.ativo || !c.categoria) continue;
    mapa.set(`${normalizar(c.categoria)}/${normalizar(c.slug)}`, c);
  }
  return mapa;
}

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
export type ResultadoVisitas = {
  porCarta: CartaVisita[];
  porOrgao: RankVisita[];
  porCategoria: RankVisita[];
  porSetor: RankVisita[];
};

const ranquear = (m: Map<string, number>): RankVisita[] =>
  [...m.entries()].map(([rotulo, visitas]) => ({ rotulo, visitas })).sort((a, b) => b.visitas - a.visitas);

export function joinVisitas(pageUrlsRaw: MatomoRow[], inventario: CartaRelacao[]): ResultadoVisitas {
  const cartas = mapaDeCartas(inventario);

  const visitasPorChave = new Map<string, number>();
  for (const row of Array.isArray(pageUrlsRaw) ? pageUrlsRaw : []) {
    const chave = chaveDoPath(row.url || row.label || "");
    if (!chave || !cartas.has(chave)) continue;
    visitasPorChave.set(chave, (visitasPorChave.get(chave) ?? 0) + (Number(row.nb_visits) || 0));
  }

  const porCarta: CartaVisita[] = [];
  const orgao = new Map<string, number>();
  const categoria = new Map<string, number>();
  const setor = new Map<string, number>();
  for (const [chave, visitas] of visitasPorChave) {
    const c = cartas.get(chave)!;
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
    if (c.setor) setor.set(c.setor, (setor.get(c.setor) ?? 0) + visitas);
  }

  porCarta.sort((a, b) => b.visitas - a.visitas);
  return { porCarta, porOrgao: ranquear(orgao), porCategoria: ranquear(categoria), porSetor: ranquear(setor) };
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
  const cartas = mapaDeCartas(inventario);
  const alvo = new Set(nomes);
  return Object.keys(porPeriodo)
    .sort()
    .map((rotulo) => {
      const linha: PontoSerie = { rotulo };
      for (const n of nomes) linha[n] = 0;
      for (const row of porPeriodo[rotulo] || []) {
        const chave = chaveDoPath(row.url || row.label || "");
        const c = chave ? cartas.get(chave) : undefined;
        if (c && alvo.has(c.titulo)) linha[c.titulo] = (linha[c.titulo] as number) + (Number(row.nb_visits) || 0);
      }
      return linha;
    });
}
