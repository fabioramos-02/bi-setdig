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
    // filter_limit=-1 (sem limite) em Actions.getPageUrls sobre um range
    // grande (ex. "Ano") retorna HTTP 500 direto do Matomo — confirmado em
    // log real, não é timeout do nosso lado. Um teto alto (5000, folga
    // confortável sobre as ~1200 cartas ativas) evita o 500 sem perder
    // cobertura real dos rankings (que são o essencial da página).
    const dias = (new Date(fim).getTime() - new Date(inicio).getTime()) / 86_400_000;
    const limitePaginas = dias > 60 ? 5000 : -1;
    const granularidade = dias > 60 ? "month" : "week";

    // As 2 chamadas são independentes (evolução filtra pelos top5 DEPOIS,
    // client-side em serieTemporal — não precisa que a 1ª termine antes) —
    // rodam em paralelo, mas só a 1ª é fatal. A 2ª (evolução) é instável no
    // Matomo pra range grande — Actions.getPageUrls com period=week/month E
    // date=range (multi-bucket numa chamada só) já falhou com HTTP 500 tanto
    // em "week" quanto em "month" pro mesmo range (não é volume de dado,
    // testado). Rankings (o essencial da página) funcionam bem sem isso, daí
    // degradar com graça em vez de derrubar a página inteira: sem evolução,
    // `serieTemporal([])` -> [], e a UI já trata isso ("Sem dado suficiente
    // pra montar a evolução neste período").
    const [pageUrlsResult, pageUrlsPorPeriodoResult] = await Promise.allSettled([
      matomo.getPageUrls(inicio, fim, limitePaginas),
      matomo.getPageUrlsPorPeriodo(inicio, fim, granularidade),
    ]);
    if (pageUrlsResult.status === "rejected") throw pageUrlsResult.reason;

    const rankings = joinVisitas(pageUrlsResult.value, inventario);
    const top5 = rankings.porCarta.slice(0, 5).map((c) => c.titulo);

    let evolucao: ReturnType<typeof serieTemporal> = [];
    if (pageUrlsPorPeriodoResult.status === "fulfilled") {
      evolucao = serieTemporal(pageUrlsPorPeriodoResult.value, inventario, top5);
    } else {
      console.error("[api/analytics/servicos] evolução falhou (não-fatal):", pageUrlsPorPeriodoResult.reason);
    }

    return NextResponse.json({ ...rankings, top5, evolucao });
  } catch (exc) {
    console.error("[api/analytics/servicos] falhou:", exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }
}
