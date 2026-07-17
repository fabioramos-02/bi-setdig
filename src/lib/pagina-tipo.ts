import type { CartaRelacao } from "./data.ts";
import { labelCategoria } from "./servicos.ts";

/**
 * Dicionário de páginas do portal — classifica qualquer URL do Matomo em um
 * tipo semântico (serviço real, órgão, página inicial…) e devolve o nome em
 * linguagem cidadã. O inventário de cartas (`datasets/cartas/v1/inventario-relacao.json`)
 * É o dicionário de serviços — não há dicionário separado a manter (ADR-012).
 * A chave de casamento é o SLUG (2º segmento do path), não `(categoria, slug)`:
 * a mesma carta é alcançável por mais de uma categoria no site real.
 */

const PORTAL_BASE = "https://www.ms.gov.br";

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Remove tudo que não é letra/número — casa "SEFAZ MS" (espaço) contra o
 * segmento de URL real "sefaz-mssecretaria-..." (sem separador). */
function stripAlnum(s: string): string {
  return normalizar(s).replace(/[^a-z0-9]/g, "");
}

export type TipoPagina =
  | "servico"
  | "pagina-inicial"
  | "orgao"
  | "meu-painel"
  | "noticia"
  | "lista-categoria"
  | "busca"
  | "outro";

export type PaginaClassificada = {
  tipo: TipoPagina;
  nome: string;
  orgaoSigla?: string;
  categoria?: string;
  /** Só em tipo "servico" — slug exato da carta no inventário. */
  slug?: string;
  href?: string;
};

type OrgaoRef = { sigla: string; siglaStripped: string; nome: string };

export type ContextoSemantico = {
  cartasPorSlug: Map<string, CartaRelacao>;
  /** Ordenado por tamanho de sigla decrescente — evita "SEFAZ" casar antes de
   * "SEFAZ MS" quando os dois seriam prefixo válido. */
  orgaos: OrgaoRef[];
};

/** Monta o contexto 1x a partir do inventário (estático) — reusar entre
 * chamadas de `classificarPagina`, nunca reconstruir por linha. */
export function construirContexto(inventario: CartaRelacao[]): ContextoSemantico {
  const cartasPorSlug = new Map<string, CartaRelacao>();
  for (const c of inventario) {
    if (!c.ativo || !c.slug) continue;
    cartasPorSlug.set(normalizar(c.slug), c);
  }

  const orgaosPorSigla = new Map<string, OrgaoRef>();
  for (const c of inventario) {
    if (!orgaosPorSigla.has(c.orgaoSigla)) {
      orgaosPorSigla.set(c.orgaoSigla, { sigla: c.orgaoSigla, siglaStripped: stripAlnum(c.orgaoSigla), nome: c.orgao });
    }
  }
  const orgaos = [...orgaosPorSigla.values()]
    .filter((o) => o.siglaStripped)
    .sort((a, b) => b.siglaStripped.length - a.siglaStripped.length);

  return { cartasPorSlug, orgaos };
}

function orgaoDoSegmento(segmento: string, ctx: ContextoSemantico): OrgaoRef | undefined {
  const s = stripAlnum(segmento);
  return ctx.orgaos.find((o) => s.startsWith(o.siglaStripped));
}

function segmentosDoPath(url: string): string[] {
  const semQuery = (url || "").split(/[?#]/)[0];
  const semHost = semQuery.replace(/^https?:\/\/[^/]+/, "");
  return semHost.split("/").filter(Boolean);
}

/**
 * Classifica uma URL do portal em tipo de página + nome em linguagem cidadã.
 * Ordem de regras (a primeira que casar decide): página inicial → carta real
 * do inventário (por slug) → página de órgão → Meu Painel → notícia → busca →
 * lista de categoria (1 segmento só) → outro (path desconhecido, honesto).
 */
export function classificarPagina(url: string, ctx: ContextoSemantico): PaginaClassificada {
  const partes = segmentosDoPath(url);
  if (partes.length === 0) return { tipo: "pagina-inicial", nome: "Página inicial", href: PORTAL_BASE };

  const [p0, p1] = partes;
  const p0n = normalizar(p0);

  if (p1) {
    const carta = ctx.cartasPorSlug.get(normalizar(p1));
    if (carta) {
      return {
        tipo: "servico",
        nome: carta.titulo,
        orgaoSigla: carta.orgaoSigla,
        categoria: carta.categoria ?? undefined,
        slug: carta.slug,
        href: `${PORTAL_BASE}/${carta.categoria}/${carta.slug}`,
      };
    }
  }

  if (p0n === "orgao" && p1) {
    const orgao = orgaoDoSegmento(p1, ctx);
    return orgao
      ? { tipo: "orgao", nome: `Serviços da ${orgao.sigla}`, orgaoSigla: orgao.sigla }
      : { tipo: "orgao", nome: "Serviços de um órgão" };
  }
  if (p0n === "workspace") return { tipo: "meu-painel", nome: "Meu Painel" };
  if (p0n === "noticias") return { tipo: "noticia", nome: "Notícia" };
  if (p0n === "buscar") return { tipo: "busca", nome: "Busca no portal" };

  if (!p1) return { tipo: "lista-categoria", nome: `Lista de serviços de ${labelCategoria(p0)}`, categoria: p0 };

  return { tipo: "outro", nome: "/" + partes.join("/") };
}
