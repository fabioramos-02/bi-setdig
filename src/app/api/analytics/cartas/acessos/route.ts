import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import * as t from "@/lib/server/matomo-transform";
import { getCartasInventarioRelacao, type AcessoBotaoCarta, type CartaRelacao } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Ranking agregado de cliques em "Acessar serviço" pra qualquer intervalo
 *  (ADR-010). Fluxo: getPageUrls no range → escolhe top-N cartas do inventário
 *  → 1 Transitions.getTransitionsForAction por carta em paralelo. Usado pra
 *  granularidades fora do período corrente (ano histórico, dia/semana/mês
 *  passado) — o snapshot estático só cobre o CORRENTE de cada uma. */
export async function GET(req: NextRequest) {
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fim = req.nextUrl.searchParams.get("fim");
  const topParam = Number(req.nextUrl.searchParams.get("top") ?? "30");
  const top = Number.isFinite(topParam) ? Math.max(5, Math.min(50, topParam)) : 30;
  if (!inicio || !fim) {
    return NextResponse.json({ error: "parâmetros 'inicio' e 'fim' (YYYY-MM-DD) são obrigatórios" }, { status: 400 });
  }

  const inventario = getCartasInventarioRelacao().filter((c) => c.ativo && c.slug && c.categoria);
  const slugPorPath = new Map<string, CartaRelacao>();
  for (const c of inventario) slugPorPath.set(`/${c.categoria}/${c.slug}`, c);

  try {
    const dias = (new Date(fim).getTime() - new Date(inicio).getTime()) / 86_400_000;
    const limitePaginas = dias > 60 ? 5000 : -1;
    const pageUrls = await matomo.getPageUrls(inicio, fim, limitePaginas);

    const visitasPorCarta = new Map<CartaRelacao, number>();
    for (const row of pageUrls ?? []) {
      const url = row.url ?? row.label ?? "";
      for (const [path, carta] of slugPorPath) {
        if (url.endsWith(path) || url.endsWith(`${path}/`)) {
          visitasPorCarta.set(carta, (visitasPorCarta.get(carta) ?? 0) + (row.nb_visits ?? 0));
          break;
        }
      }
    }

    const topCartas = [...visitasPorCarta.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([carta]) => carta);

    // Transitions em paralelo — Matomo aguenta ~30 concorrentes; N=30 folga.
    // Failure isolada por carta = pula (segue mesma regra do pipeline Python).
    const chamadas = await Promise.allSettled(
      topCartas.map((c) => matomo.getTransitionsForAction(inicio, fim, `https://www.ms.gov.br/${c.categoria}/${c.slug}`)),
    );

    const acessos: AcessoBotaoCarta[] = [];
    chamadas.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const carta = topCartas[i];
        const linha = t.acessosBotaoServico(r.value, carta, 5);
        if (linha) acessos.push(linha);
      } else {
        console.error(`[api/analytics/cartas/acessos] ${topCartas[i].slug} falhou:`, r.reason);
      }
    });

    acessos.sort((a, b) => b.cliquesTotais - a.cliquesTotais);
    return NextResponse.json({ cartas: acessos, totalConsultado: topCartas.length });
  } catch (exc) {
    console.error(`[api/analytics/cartas/acessos] falhou:`, exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }
}
