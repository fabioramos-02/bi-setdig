import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import { cliquesTransitionsPorHost } from "@/lib/server/matomo-transform";
import { getCartasInventarioRelacao, type AcessoBotaoCarta, type CartaRelacao } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PORTAL_BASE_URL = "https://www.ms.gov.br";

/** Cliques em "Acessar serviço" EXATOS por carta —
 *  `Transitions.getTransitionsForAction` na URL do portal da carta
 *  (`https://www.ms.gov.br/<categoria>/<slug>`). Retorna outlinks daquela
 *  página específica; sessão que passou pela carta e clicou no destino
 *  externo. Resolve URL compartilhada (N cartas → mesmo urlExterno): cada
 *  carta tem slug único no portal, Transitions só devolve o que originou
 *  dela.
 *
 *  Rota rejeita chamada sem `orgao` ou `slug`.
 *  Modo `?slug=`: 1 chamada Transitions.
 *  Modo `?orgao=`: N chamadas Transitions paralelas (1 por carta ativa
 *  com urlExterno). Threshold client THRESHOLD_BULK_ORGAO=15 mantém N
 *  pequeno; individual (>15) fica no clique da linha.
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
    try {
      const cliques = await cliquesDaCarta(carta, inicio, fim);
      return NextResponse.json({ carta: toAcesso(carta, cliques) });
    } catch (exc) {
      console.error(`[api/analytics/cartas/acessos?slug=${slug}] falhou:`, exc);
      return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
    }
  }

  // Modo órgão — N chamadas Transitions em paralelo
  const cartasOrgao = inventario.filter((c) => c.orgaoSigla === orgao);
  if (cartasOrgao.length === 0) {
    return NextResponse.json({ cartas: [], totalCartasComUrlExterno: 0, totalCartasComCliques: 0 });
  }

  const cliquesPorCarta = await Promise.all(
    cartasOrgao.map(async (c): Promise<[CartaRelacao, number]> => {
      try {
        return [c, await cliquesDaCarta(c, inicio, fim)];
      } catch (exc) {
        console.error(`[api/analytics/cartas/acessos?orgao=${orgao} carta=${c.slug}] falhou:`, exc);
        return [c, 0];
      }
    }),
  );

  const cartas = cliquesPorCarta
    .map(([c, cliques]) => toAcesso(c, cliques))
    .sort((a, b) => b.cliques - a.cliques);

  return NextResponse.json({
    cartas,
    totalCartasComUrlExterno: cartasOrgao.length,
    totalCartasComCliques: cartas.filter((c) => c.cliques > 0).length,
  });
}

async function cliquesDaCarta(carta: CartaRelacao, inicio: string, fim: string): Promise<number> {
  const actionUrl = `${PORTAL_BASE_URL}/${carta.categoria ?? ""}/${carta.slug}`;
  const raw = await matomo.getTransitionsForAction(inicio, fim, actionUrl);
  return cliquesTransitionsPorHost(raw, carta.urlExterno ?? "");
}

function toAcesso(carta: CartaRelacao, cliques: number): AcessoBotaoCarta {
  return {
    slug: carta.slug,
    titulo: carta.titulo,
    orgaoSigla: carta.orgaoSigla ?? null,
    categoria: carta.categoria ?? null,
    urlCarta: `${PORTAL_BASE_URL}/${carta.categoria ?? ""}/${carta.slug}`,
    urlExterno: carta.urlExterno ?? "",
    cliques,
  };
}
