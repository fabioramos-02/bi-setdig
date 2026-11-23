import { NextResponse } from "next/server";
import { getDatasetUpdatedAt, getTfsContrato, getTfsEtpUst, getTfsFinanceiro, getTfsItens, getTfsSprints } from "@/lib/data";
import { prepararResumoXvia } from "@/lib/xvia-resumo";
import { respostasSecretario } from "@/lib/xvia-secretario";

// Gerado no build (refresh diário, ADR-014). O painel.py do lancar-demandas-xvia lê este arquivo e
// grava as mesmas 5 respostas no dashboard "Visão do Secretário" do TFS: uma conta só, no BI.
export const dynamic = "force-static";

export function GET() {
  const atualizadoEm = getDatasetUpdatedAt("tfs", "itens");
  if (!atualizadoEm) return NextResponse.json({ erro: "sem dados do TFS" }, { status: 503 });
  const hoje = atualizadoEm.slice(0, 10);
  const r = prepararResumoXvia({
    itens: getTfsItens(), sprints: getTfsSprints(), contrato: getTfsContrato(), etp: getTfsEtpUst(),
    financeiro: getTfsFinanceiro(), hoje, recorte: false,
  });
  return NextResponse.json({
    atualizadoEm: hoje,
    cabecalho: r.cabecalho,
    painel: "https://bi-setdig.vercel.app/projeto-xvia?visao=secretario&aba=relatorio",
    respostas: respostasSecretario(r).map(({ destino, ...x }) => ({ ...x, link: `https://bi-setdig.vercel.app/projeto-xvia?visao=${destino.nivel}&aba=${destino.aba}` })),
  });
}
