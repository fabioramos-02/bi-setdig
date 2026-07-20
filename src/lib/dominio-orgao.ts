import type { DominioSaida } from "./data.ts";

/**
 * Domínio de saída do portal → órgão/sistema em linguagem cidadã. Dicionário
 * pequeno e explícito, não classificador estatístico — mesmo espírito de
 * EXCLUIR_URLS (matomo-transform.ts) e TEMAS (busca-tema.ts): casar domínio
 * por sigla via regra genérica (prefixo/substring) gera falso-positivo, pois
 * todo domínio termina em ".ms.gov.br" e fragmentos curtos como "ms" batem
 * com quase qualquer sigla de órgão. Levantado contra os domínios reais de
 * `datasets/matomo/v1/fuga-hub.json` (todos os períodos).
 */
const DOMINIO_ORGAO: Record<string, { nome: string; orgaoSigla?: string }> = {
  "www.meudetran.ms.gov.br": { nome: "DETRAN", orgaoSigla: "DETRAN" },
  "www.sefaz.ms.gov.br": { nome: "SEFAZ MS", orgaoSigla: "SEFAZ MS" },
  "eservicos.sefaz.ms.gov.br": { nome: "SEFAZ MS", orgaoSigla: "SEFAZ MS" },
  "servicos.efazenda.ms.gov.br": { nome: "SEFAZ MS (e-Fazenda)", orgaoSigla: "SEFAZ MS" },
  "portalservicos.jucems.ms.gov.br": { nome: "JUCEMS", orgaoSigla: "JUCEMS" },
  "www.jucems.ms.gov.br": { nome: "JUCEMS", orgaoSigla: "JUCEMS" },
  "servicos.sejusp.ms.gov.br": { nome: "SEJUSP", orgaoSigla: "SEJUSP" },
  "antecedentes.sejusp.ms.gov.br": { nome: "SEJUSP", orgaoSigla: "SEJUSP" },
  "www.cgp.sejusp.ms.gov.br": { nome: "CGP", orgaoSigla: "CGP" },
  "devir.pc.ms.gov.br": { nome: "PCMS", orgaoSigla: "PCMS" },
  "e-ms.ms.gov.br": { nome: "Plataforma e-MS (login único)" },
};

/** Domínio sem entrada no dicionário: honesto, mantém o nome do domínio (sem
 * "www.") em vez de inventar um órgão que não confirmamos. */
export function classificarDominio(dominio: string): { nome: string; orgaoSigla?: string } {
  return DOMINIO_ORGAO[dominio] ?? { nome: dominio.replace(/^www\./, "") };
}

export type SaidaAgrupada = { nome: string; orgaoSigla?: string; saidas: number };

/** Agrupa por órgão resolvido (ou nome, quando não há órgão) — a mesma sigla
 * pode vir de mais de um domínio (ex. SEFAZ MS aparece em 3), sem agrupar a
 * pergunta "quais órgãos concentram as saídas" fica escondida atrás de 3
 * linhas separadas. */
export function agruparSaidasPorOrgao(fugaHub: DominioSaida[]): SaidaAgrupada[] {
  const porChave = new Map<string, SaidaAgrupada>();
  for (const f of fugaHub) {
    const classificado = classificarDominio(f.dominio);
    const chave = classificado.orgaoSigla ?? classificado.nome;
    const atual = porChave.get(chave);
    if (atual) atual.saidas += f.saidas;
    else porChave.set(chave, { ...classificado, saidas: f.saidas });
  }
  return [...porChave.values()].sort((a, b) => b.saidas - a.saidas);
}
