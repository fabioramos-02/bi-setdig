import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import * as t from "@/lib/server/matomo-transform";
import { perfilFiltroLive, topServicosLive } from "@/lib/server/perfil-live";
import { getMatomoPerfilFiltro } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exceção pontual ao ADR-001 (ADR-010) — só pra "Intervalo de datas": as
 * outras 4 opções de período (dia/semana/mês/ano) continuam 100%
 * estáticas/build-time via datasets/. Aqui period=range faz 1 chamada por
 * relatório pro intervalo exato escolhido — já roda em produção pros mesmos
 * relatórios no dashboard Streamlit irmão, sem instabilidade documentada.
 */
export async function GET(req: NextRequest) {
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fim = req.nextUrl.searchParams.get("fim");
  if (!inicio || !fim) {
    return NextResponse.json({ error: "parâmetros 'inicio' e 'fim' (YYYY-MM-DD) são obrigatórios" }, { status: 400 });
  }

  try {
    const [browsersRaw, deviceTypeRaw, visitTimeRaw, cityRaw, pageUrlsRaw, searchRaw, entryRaw, outlinksRaw] = await Promise.all([
      matomo.getBrowsers(inicio, fim),
      matomo.getDeviceType(inicio, fim),
      matomo.getVisitTime(inicio, fim),
      matomo.getCity(inicio, fim, 200),
      matomo.getPageUrls(inicio, fim, -1),
      matomo.getSiteSearchKeywords(inicio, fim, 50),
      matomo.getEntryPages(inicio, fim, 20),
      matomo.getOutlinks(inicio, fim, 50),
    ]);

    const buscaNativa = t.searchKeywords(searchRaw);
    const buscaUrls = t.searchFromUrls(pageUrlsRaw);
    // Catálogo estável de serviços (labels/paths/ícones) vem do snapshot mês;
    // só as visitas são recalculadas pro intervalo a partir do mesmo pageUrlsRaw.
    const template = getMatomoPerfilFiltro().mes;

    return NextResponse.json({
      navegadores: t.topNWithOthers(browsersRaw, "navegador", 4),
      dispositivos: t.topNWithOthers(deviceTypeRaw, "dispositivo", 2),
      horarios: t.visitTime(visitTimeRaw),
      geografia: t.citiesMs(cityRaw),
      paginas: t.topPages(pageUrlsRaw, 20),
      busca: t.mergeSearch(buscaNativa, buscaUrls, 20),
      portasEntrada: t.entryPages(entryRaw, 20),
      fugaHub: t.outlinks(outlinksRaw, 40),
      perfil: perfilFiltroLive(pageUrlsRaw, template),
      servicosMaisAcessados: topServicosLive(pageUrlsRaw, template, 15),
    });
  } catch (exc) {
    console.error("[api/analytics/portal-ms] falhou:", exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }
}
