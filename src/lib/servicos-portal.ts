import type { ServicoAcessado, DemandaOrgao, PerfilResumo } from "./data.ts";
import type { Recomendacao } from "./saude-portal.ts";

/**
 * Serviço e órgão em destaque na Visão Geral (ADR-012, camada semântica) —
 * top 1 de servicosMaisAcessados/demandaPorOrgao, nome/órgão já resolvidos
 * pelo classificador — nunca a URL crua. Arquivo separado de
 * saude-portal.ts pra não estourar 250 linhas (AGENTS.md).
 */

const PORTAL_BASE = "https://www.ms.gov.br";
const LIMIAR_CONCENTRACAO_PCT = 40;

export type ServicoTop = { nome: string; orgaoSigla: string | null; visitas: number; href: string };
export type OrgaoTop = DemandaOrgao;

export function calcularServicoTop(servicos: ServicoAcessado[]): ServicoTop | null {
  const top = servicos[0];
  if (!top) return null;
  return { nome: top.servico, orgaoSigla: top.orgaoSigla ?? null, visitas: top.visitas, href: `${PORTAL_BASE}${top.path}` };
}

export function calcularOrgaoTop(demanda: DemandaOrgao[]): OrgaoTop | null {
  return demanda[0] ?? null;
}

/** % das visitas do ranking que não puderam ser associadas a um órgão —
 * honestidade sobre a lacuna do dado (AGENTS.md), não esconder atrás de um
 * ranking que parece completo. */
export function pctSemOrgao(servicos: ServicoAcessado[]): number {
  const total = servicos.reduce((acc, s) => acc + s.visitas, 0);
  if (total <= 0) return 0;
  const semOrgao = servicos.filter((s) => !s.orgaoSigla).reduce((acc, s) => acc + s.visitas, 0);
  return Math.round((semOrgao / total) * 100);
}

/** Achado pra Visão Geral: o cidadão acha o serviço pela navegação por
 * perfil (Cidadão/Empresa/Servidor Público/Gestão Pública), ou vai direto
 * pro que precisa? Honesto nos 2 sentidos — nunca afirma "pouco usado"
 * quando o uso está acima do mínimo considerado relevante (`limiarPct`,
 * ver transform/perfil.py::ADOPTION_THRESHOLD). */
export function fraseNavegacaoPorPerfil(resumo: PerfilResumo): string | null {
  if (resumo.homeVisitors <= 0 || resumo.umACada <= 0) return null;
  const umACada = resumo.umACada.toLocaleString("pt-BR");
  return resumo.usoRealPct < resumo.limiarPct
    ? `Só 1 em cada ${umACada} visitantes da página inicial chega a um serviço pela navegação por perfil (Cidadão, Empresa, Servidor Público, Gestão Pública) — a maior parte busca direto o serviço que precisa.`
    : `1 em cada ${umACada} visitantes da página inicial chega a um serviço pela navegação por perfil — acima do mínimo considerado relevante (${resumo.limiarPct}%).`;
}

/** Órgão com ≥40% da demanda por serviços — dependência de 1 órgão só pro
 * cidadão achar o que precisa, digna de atenção de gestão (AGENTS.md). */
export function recomendacaoConcentracao(orgaoTop: OrgaoTop | null): Recomendacao | null {
  if (!orgaoTop || orgaoTop.pct < LIMIAR_CONCENTRACAO_PCT) return null;
  return {
    texto: `${orgaoTop.orgao} concentra ${orgaoTop.pct.toFixed(0)}% da demanda por serviços digitais — avaliar se outros órgãos precisam de mais visibilidade no portal.`,
  };
}
