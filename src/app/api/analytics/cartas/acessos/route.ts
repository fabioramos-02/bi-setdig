import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import { acessosBotaoServicoPorUrl } from "@/lib/server/matomo-transform";
import { getCartasInventarioRelacao, type AcessoBotaoCarta, type CartaRelacao } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Cliques em "Acessar serviço" sob demanda — 2 modos, ambos com 1 chamada
 *  Matomo segmentada. Rota rejeita chamada sem `orgao` ou `slug` pra evitar
 *  a chamada site-wide (a UX força filtrar por órgão antes).
 *
 *   ?orgao=SIGLA   → cartas ativas do órgão (inclui as com 0 cliques).
 *                    Segment: outlinkUrl=@dom1,outlinkUrl=@dom2 (OR).
 *   ?slug=SLUG     → 1 carta específica (inclui 0). Segment:
 *                    pageUrl=@/<slug>;outlinkUrl=@<dom> (AND) — filtra
 *                    sessões que passaram pela carta, resolve URL
 *                    compartilhada entre cartas.
 */
export async function GET(req: NextRequest) {
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fim = req.nextUrl.searchParams.get("fim");
  const orgao = req.nextUrl.searchParams.get("orgao");
  const slug = req.nextUrl.searchParams.get("slug");

  if (!inicio || !fim) {
    return NextResponse.json({ error: "parâmetros 'inicio' e 'fim' (YYYY-MM-DD) são obrigatórios" }, { status: 400 });
  }
  if (!orgao && !slug) {
    return NextResponse.json({ error: "informe 'orgao' ou 'slug' — chamada site-wide não é permitida" }, { status: 400 });
  }
  if (orgao && slug) {
    return NextResponse.json({ error: "use apenas 'orgao' ou 'slug', não os dois" }, { status: 400 });
  }

  const inventario = getCartasInventarioRelacao().filter((c) => c.ativo && c.slug && c.urlExterno);

  if (slug) {
    const carta = inventario.find((c) => c.slug === slug);
    if (!carta) {
      return NextResponse.json({ error: `carta '${slug}' não encontrada no inventário ativo` }, { status: 404 });
    }
    const urlExterno = carta.urlExterno ?? "";
    const dominio = hostDe(urlExterno);
    if (!dominio) {
      return NextResponse.json({ error: "carta sem domínio parseável em urlExterno" }, { status: 422 });
    }
    const segment = `pageUrl=@/${carta.slug};outlinkUrl=@${dominio}`;
    try {
      const outlinks = await matomo.getOutlinksFlatSegmented(inicio, fim, segment);
      const cliques = (outlinks ?? []).reduce((acc, r) => acc + (r.nb_visits ?? 0), 0);
      const resposta: AcessoBotaoCarta = {
        slug: carta.slug,
        titulo: carta.titulo,
        orgaoSigla: carta.orgaoSigla ?? null,
        categoria: carta.categoria ?? null,
        urlCarta: `https://www.ms.gov.br/${carta.categoria ?? ""}/${carta.slug}`,
        urlExterno,
        cliques,
      };
      return NextResponse.json({ carta: resposta });
    } catch (exc) {
      console.error(`[api/analytics/cartas/acessos?slug=${slug}] falhou:`, exc);
      return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
    }
  }

  // Modo órgão
  const cartasOrgao = inventario.filter((c) => c.orgaoSigla === orgao);
  if (cartasOrgao.length === 0) {
    return NextResponse.json({ cartas: [], totalCartasComUrlExterno: 0, totalCartasComCliques: 0 });
  }
  const dominios = dominiosUnicos(cartasOrgao);
  if (dominios.length === 0) {
    return NextResponse.json({ cartas: [], totalCartasComUrlExterno: cartasOrgao.length, totalCartasComCliques: 0 });
  }
  const segment = dominios.map((d) => `outlinkUrl=@${d}`).join(",");
  try {
    const outlinks = await matomo.getOutlinksFlatSegmented(inicio, fim, segment);
    const cartas = acessosBotaoServicoPorUrl(outlinks, cartasOrgao, true);
    return NextResponse.json({
      cartas,
      totalCartasComUrlExterno: cartasOrgao.length,
      totalCartasComCliques: cartas.filter((c) => c.cliques > 0).length,
    });
  } catch (exc) {
    console.error(`[api/analytics/cartas/acessos?orgao=${orgao}] falhou:`, exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }
}

function hostDe(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function dominiosUnicos(cartas: CartaRelacao[]): string[] {
  const set = new Set<string>();
  for (const c of cartas) {
    const h = c.urlExterno ? hostDe(c.urlExterno) : null;
    if (h) set.add(h);
  }
  return [...set];
}
