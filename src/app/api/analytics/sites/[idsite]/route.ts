import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import * as t from "@/lib/server/matomo-transform";
import { calcularMatchRateMapa } from "@/lib/server/geo-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Drill-down de um site do catálogo (Sites) — sempre ao vivo, não tem
 * dataset estático (só o site principal do portal tem snapshot pré-computado). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ idsite: string }> }) {
  const { idsite } = await params;
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fim = req.nextUrl.searchParams.get("fim");
  if (!inicio || !fim) {
    return NextResponse.json({ error: "parâmetros 'inicio' e 'fim' (YYYY-MM-DD) são obrigatórios" }, { status: 400 });
  }

  try {
    const [dailyRaw, pageUrlsRaw, browsersRaw, deviceTypeRaw, visitTimeRaw, cityRaw, searchRaw] = await Promise.all([
      matomo.getVisitsSummaryDaily(inicio, fim, idsite),
      matomo.getPageUrls(inicio, fim, -1, idsite),
      matomo.getBrowsers(inicio, fim, 20, idsite),
      matomo.getDeviceType(inicio, fim, idsite),
      matomo.getVisitTime(inicio, fim, idsite),
      matomo.getCity(inicio, fim, 200, idsite),
      matomo.getSiteSearchKeywords(inicio, fim, -1, idsite),
    ]);

    const geografia = t.citiesMs(cityRaw);
    const buscaNativa = t.searchKeywords(searchRaw);
    const buscaUrls = t.searchFromUrls(pageUrlsRaw);

    return NextResponse.json({
      tendencia: t.visitsDaily(dailyRaw),
      paginas: t.topPages(pageUrlsRaw, 20),
      navegadores: t.topNWithOthers(browsersRaw, "navegador", 4),
      dispositivos: t.topNWithOthers(deviceTypeRaw, "dispositivo", 2),
      horarios: t.visitTime(visitTimeRaw),
      geografia,
      matchRateMapa: calcularMatchRateMapa(geografia),
      busca: t.mergeSearch(buscaNativa, buscaUrls, 20).termos,
    });
  } catch (exc) {
    console.error(`[api/analytics/sites/${idsite}] falhou:`, exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }
}
