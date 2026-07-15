import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import { joinVisitas, serieTemporal } from "@/lib/server/cartas-visitas";
import { getCartasInventarioRelacao } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Demanda por carta de serviço no período (ADR-010) — cruza o inventário
 * estático das cartas com as visitas ao vivo do portal (Matomo). Reage ao
 * filtro de período de /servicos. */
export async function GET(req: NextRequest) {
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fim = req.nextUrl.searchParams.get("fim");
  if (!inicio || !fim) {
    return NextResponse.json({ error: "parâmetros 'inicio' e 'fim' (YYYY-MM-DD) são obrigatórios" }, { status: 400 });
  }

  try {
    const inventario = getCartasInventarioRelacao();
    // 1 chamada agregada (rankings) + 1 semanal (evolução dos top-5).
    const [pageUrlsRaw, pageUrlsSemana] = await Promise.all([
      matomo.getPageUrls(inicio, fim, -1),
      matomo.getPageUrlsPorPeriodo(inicio, fim, "week"),
    ]);

    const rankings = joinVisitas(pageUrlsRaw, inventario);
    const top5 = rankings.porCarta.slice(0, 5).map((c) => c.titulo);
    const evolucao = serieTemporal(pageUrlsSemana, inventario, top5);

    return NextResponse.json({ ...rankings, top5, evolucao });
  } catch (exc) {
    console.error("[api/analytics/servicos] falhou:", exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }
}
