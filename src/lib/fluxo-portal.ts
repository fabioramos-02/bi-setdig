import type { PaginaClassificada } from "./pagina-tipo.ts";
import type { ComposicaoPaginas } from "./paginas-portal.ts";
import type { SaidaAgrupada } from "./dominio-orgao.ts";

/**
 * Leitura executiva do fluxo de navegação — como o cidadão chega ao portal e
 * pra onde segue depois. Composição de volumes agregados, não jornada por
 * visitante: Transitions foi removido do pipeline por instabilidade
 * (ADR-010) — "para onde seguem" é continuidade da jornada num sistema do
 * governo (o cidadão achou o serviço e foi executá-lo lá), não abandono do
 * portal; nunca descrever como "conversão"/"funil" (ver revisão de gestão de
 * 2026-07 do Portal Único).
 */

type PaginaComVisitas = PaginaClassificada & { visitas: number };

export type ResumoFluxo = { comoChegam: string; paraOndeSeguem: string; oportunidade: string };

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/**
 * `composicaoEntrada` vem de calcularComposicaoPaginas (paginas-portal.ts)
 * aplicado às ENTRADAS (não pageviews totais) — mesma função, dado
 * diferente: `homePctDoTotal` aqui já significa "fração de todas as visitas
 * do período que começaram pela página inicial" (toda visita tem exatamente
 * 1 entrada, então o total de entradas = total de visitas). `servicosTop`/
 * `saidasTop` já vêm ordenados desc.
 */
export function gerarResumoFluxo(
  composicaoEntrada: ComposicaoPaginas,
  servicosTop: PaginaComVisitas[],
  saidasTop: SaidaAgrupada[],
  rotuloPeriodo: string,
): ResumoFluxo | null {
  if (composicaoEntrada.homeVisitas === 0 && composicaoEntrada.acaoVisitas === 0) return null;

  const nomesServicos = servicosTop.slice(0, 3).map((s) => s.nome);
  const comoChegam = `${Math.round(composicaoEntrada.homePctDoTotal)}% dos acessos ${rotuloPeriodo} começaram pela página inicial (${fmt(composicaoEntrada.homeVisitas)} entradas); o restante entrou direto em alguma página do portal — boa parte já em serviços como ${nomesServicos.length > 0 ? listar(nomesServicos) : "os mais procurados"}.`;

  const nomesOrgaos = saidasTop.slice(0, 3).map((s) => s.nome);
  const paraOndeSeguem =
    nomesOrgaos.length > 0
      ? `Depois de encontrar o que precisavam, os cidadãos seguiram principalmente para ${listar(nomesOrgaos)} — sinal de que o Portal Único está cumprindo o papel de integrar o acesso aos serviços digitais do governo, não de retê-los.`
      : "Ainda não há registro de saída pra outros sistemas do governo no período.";

  const oportunidade = servicosTop[0]
    ? `Como poucos serviços concentram boa parte das entradas — especialmente "${servicosTop[0].nome}" — priorizar melhorias nesses pontos de acesso pode beneficiar uma parcela significativa dos cidadãos que usam o Portal.`
    : "Sem serviço em destaque suficiente pra apontar uma oportunidade concreta no momento.";

  return { comoChegam, paraOndeSeguem, oportunidade };
}
