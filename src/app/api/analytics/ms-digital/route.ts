import { NextRequest, NextResponse } from "next/server";
import * as ga4 from "@/lib/server/ga4-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exceção pontual ao ADR-001 (ADR-010) — só pra "Intervalo de datas". GA4
 * Data API aceita startDate/endDate arbitrários numa única chamada, sem
 * chunking nem instabilidade conhecida. CrossCanalTab (mistura GA4 + estudo
 * Matomo de perfil, mais complexo) e o estudo de Perfil continuam no
 * fallback snapshot por enquanto — não portados nesta rodada. */
export async function GET(req: NextRequest) {
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fim = req.nextUrl.searchParams.get("fim");
  if (!inicio || !fim) {
    return NextResponse.json({ error: "parâmetros 'inicio' e 'fim' (YYYY-MM-DD) são obrigatórios" }, { status: 400 });
  }

  try {
    const [visaoGeral, plataforma, servicos, funil, horarios] = await Promise.all([
      ga4.getOverview(inicio, fim),
      ga4.getPlatform(inicio, fim),
      ga4.getServices(inicio, fim, 15),
      ga4.getFunnel(inicio, fim),
      ga4.getVisitTime(inicio, fim),
    ]);

    return NextResponse.json({ visaoGeral, plataforma, servicos, funil, horarios });
  } catch (exc) {
    console.error("[api/analytics/ms-digital] falhou:", exc);
    return NextResponse.json({ error: "GA4 indisponível" }, { status: 502 });
  }
}
