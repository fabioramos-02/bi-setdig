import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import { acessosBotaoServicoPorUrl, urlsCompartilhadasNoInventario } from "@/lib/server/matomo-transform";
import { getCartasInventarioRelacao, type AcessoBotaoCarta } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Cliques em "Acessar serviço" sob demanda — 1 chamada Matomo
 *  `Actions.getOutlinks?flat=1` sem segment (sub-segundo até em period=year;
 *  segment ligado engargala em >30s → 502, ver refactor 2026-08-27). Server
 *  cruza com inventário local filtrado por `orgao` OU `slug` e devolve.
 *
 *  Rota rejeita chamada sem `orgao` nem `slug` — a UX força filtrar por
 *  órgão antes de buscar; evita retornar o inventário inteiro à toa.
 *
 *  URL compartilhada entre N cartas (60 URLs, 546 cartas): o valor mostrado
 *  é o total do destino, não específico da carta. Marca-se com
 *  `cliquesCompartilhado=true` e a UI mostra ⚠. Desambiguar exigia N
 *  chamadas segmentadas — cura pior que a doença.
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

  const inventarioTodo = getCartasInventarioRelacao();
  const inventarioAtivo = inventarioTodo.filter((c) => c.ativo && c.slug && c.urlExterno);
  const compartilhadas = urlsCompartilhadasNoInventario(inventarioTodo);

  let outlinks;
  try {
    outlinks = await matomo.getOutlinksFlat(inicio, fim);
  } catch (exc) {
    console.error(`[api/analytics/cartas/acessos] falhou:`, exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }

  if (slug) {
    const carta = inventarioAtivo.find((c) => c.slug === slug);
    if (!carta) {
      return NextResponse.json({ error: `carta '${slug}' não encontrada no inventário ativo` }, { status: 404 });
    }
    const linhas = acessosBotaoServicoPorUrl(outlinks, [carta], true, compartilhadas);
    return NextResponse.json({ carta: linhas[0] as AcessoBotaoCarta });
  }

  // Modo órgão
  const cartasOrgao = inventarioAtivo.filter((c) => c.orgaoSigla === orgao);
  if (cartasOrgao.length === 0) {
    return NextResponse.json({ cartas: [], totalCartasComUrlExterno: 0, totalCartasComCliques: 0 });
  }
  const cartas = acessosBotaoServicoPorUrl(outlinks, cartasOrgao, true, compartilhadas);
  return NextResponse.json({
    cartas,
    totalCartasComUrlExterno: cartasOrgao.length,
    totalCartasComCliques: cartas.filter((c) => c.cliques > 0).length,
  });
}
