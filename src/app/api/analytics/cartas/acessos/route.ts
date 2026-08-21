import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import { acessosBotaoServicoPorUrl } from "@/lib/server/matomo-transform";
import { getCartasInventarioRelacao } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Ranking de cliques em "Acessar serviço" pra qualquer intervalo (ADR-010).
 *  1 chamada `Actions.getOutlinks?flat=1` cruzada com `urlExterno` do
 *  inventário — sub-segundo. Substitui a versão antiga que fazia N chamadas
 *  Transitions e travava em 60s+. */
export async function GET(req: NextRequest) {
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fim = req.nextUrl.searchParams.get("fim");
  if (!inicio || !fim) {
    return NextResponse.json({ error: "parâmetros 'inicio' e 'fim' (YYYY-MM-DD) são obrigatórios" }, { status: 400 });
  }

  const inventario = getCartasInventarioRelacao().filter((c) => c.ativo && c.slug && c.urlExterno);
  if (inventario.length === 0) {
    return NextResponse.json(
      { cartas: [], aviso: "Nenhuma carta ativa com urlExterno cadastrado — rode o pipeline de cartas." },
      { status: 200 },
    );
  }

  try {
    const outlinks = await matomo.getOutlinksFlat(inicio, fim, 5000);
    const cartas = acessosBotaoServicoPorUrl(outlinks, inventario);
    return NextResponse.json({
      cartas,
      totalCartasComUrlExterno: inventario.length,
      totalCartasComCliques: cartas.length,
    });
  } catch (exc) {
    console.error(`[api/analytics/cartas/acessos] falhou:`, exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }
}
