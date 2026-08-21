import { NextRequest, NextResponse } from "next/server";
import * as matomo from "@/lib/server/matomo-client";
import * as t from "@/lib/server/matomo-transform";
import { getCartasInventarioRelacao } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Drill-down live dos cliques em "Acessar serviço" de UMA carta específica —
 * cauda-longa fora do top-100 do dataset estático acessos-botao-servico
 * (ADR-010). Uma call Transitions.getTransitionsForAction, transform reusa a
 * mesma regra do pipeline. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inicio = req.nextUrl.searchParams.get("inicio");
  const fim = req.nextUrl.searchParams.get("fim");
  if (!inicio || !fim) {
    return NextResponse.json({ error: "parâmetros 'inicio' e 'fim' (YYYY-MM-DD) são obrigatórios" }, { status: 400 });
  }

  const carta = getCartasInventarioRelacao().find((c) => c.slug === slug && c.ativo);
  if (!carta) {
    return NextResponse.json({ error: `carta '${slug}' não encontrada no inventário ativo` }, { status: 404 });
  }

  try {
    const actionUrl = `https://www.ms.gov.br/${carta.categoria}/${carta.slug}`;
    const raw = await matomo.getTransitionsForAction(inicio, fim, actionUrl);
    const acesso = t.acessosBotaoServico(raw, carta, 5);
    if (!acesso) {
      return NextResponse.json({ slug, titulo: carta.titulo, semDado: true }, { status: 200 });
    }
    return NextResponse.json(acesso);
  } catch (exc) {
    console.error(`[api/analytics/cartas/${slug}/acessos] falhou:`, exc);
    return NextResponse.json({ error: "Matomo indisponível" }, { status: 502 });
  }
}
