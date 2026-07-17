/**
 * Rótulos do domínio Serviços — cálculo fora do componente (convencoes.md).
 */
import type { CartaRelacao, InventarioOrgao } from "@/lib/data";

export const CATEGORIAS_PORTAL: Record<string, { nome: string; icon: string }> = {
  "administracao-publica": { nome: "Administração Pública", icon: "account_balance" },
  "agropecuaria-e-vida-rural": { nome: "Agropecuária e Vida Rural", icon: "agriculture" },
  "arte-e-cultura": { nome: "Arte e Cultura", icon: "theater_comedy" },
  "assistencia-social": { nome: "Assistência Social", icon: "diversity_3" },
  "ciencia-e-tecnologia": { nome: "Ciência e Tecnologia", icon: "biotech" },
  "comunicacao-e-transparencia": { nome: "Comunicação e Transparência", icon: "campaign" },
  "direitos-e-cidadania": { nome: "Direitos e Cidadania", icon: "groups" },
  "educacao-e-pesquisa": { nome: "Educação e Pesquisa", icon: "auto_stories" },
  "empresa-industria-e-comercio": { nome: "Empresa, Indústria e Comércio", icon: "apartment" },
  "energia": { nome: "Energia", icon: "electrical_services" },
  "esporte-e-lazer": { nome: "Esporte e Lazer", icon: "sports_soccer" },
  "financas-e-impostos": { nome: "Finanças e Impostos", icon: "currency_exchange" },
  "forcas-armadas-e-defesa-civil": { nome: "Forças Armadas e Defesa Civil", icon: "local_police" },
  "habitacao": { nome: "Habitação", icon: "home" },
  "infraestrutura": { nome: "Infraestrutura", icon: "construction" },
  "justica": { nome: "Justiça", icon: "balance" },
  "meio-ambiente": { nome: "Meio Ambiente", icon: "compost" },
  "saude-e-cuidado": { nome: "Saúde e Cuidado", icon: "medical_services" },
  "seguranca": { nome: "Segurança", icon: "security" },
  "trabalho-emprego-e-previdencia": { nome: "Trabalho, Emprego e Previdência", icon: "work" },
  "transito-e-transportes": { nome: "Trânsito e Transportes", icon: "directions_car" },
  "turismo": { nome: "Turismo", icon: "follow_the_signs" },
};

/** "saude-e-cuidado" -> "Saúde e Cuidado" baseando-se no dicionário oficial.
 * Fallback formata em runtime se não achar no dicionário. */
export function labelCategoria(slug: string | null): string {
  if (!slug) return "Sem categoria";
  if (CATEGORIAS_PORTAL[slug]) return CATEGORIAS_PORTAL[slug].nome;
  const texto = slug.replace(/-/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// \b evita casar "dia" dentro de "ImeDIAto" (Acesso Imediato). Compartilhada
// por prazoServico (formatação) e resumoPrazo (agregação) — mesma definição
// de "é uma unidade de tempo" nos dois lugares.
const UNIDADE_TEMPORAL = /\b(dias?|horas?|m[eê]s(es)?|semanas?|anos?)\b/i;

/** Prazo legível: "90 Dias corridos", mas "Acesso Imediato"/"Conforme Tabela…"
 * sem prefixar o número (o `tempoTotal` vem 1/0 nesses casos e o "1 Acesso
 * Imediato" lê errado). Só antepõe o número quando a unidade é temporal. */
export function prazoServico(tempoTotal: number | null, tipoTempo: string | null): string {
  const t = (tipoTempo ?? "").trim();
  if (!t) return "—";
  return UNIDADE_TEMPORAL.test(t) && tempoTotal && tempoTotal > 0 ? `${tempoTotal} ${t}` : t;
}

/** Converte pra dias aproximados quando a unidade não é dia — só usado pra
 * bucketar em faixas (resumoPrazo), não pra exibir (prazoServico mostra a
 * unidade original). */
function diasAproximados(tempoTotal: number, tipoTempo: string): number {
  const t = tipoTempo.toLowerCase();
  if (/hora/.test(t)) return tempoTotal / 24;
  if (/semana/.test(t)) return tempoTotal * 7;
  if (/m[eê]s/.test(t)) return tempoTotal * 30;
  if (/ano/.test(t)) return tempoTotal * 365;
  return tempoTotal;
}

export type FaixaPrazo = { label: string; total: number };

/** Quantos serviços caem em cada faixa de prazo — oferta (não depende do
 * período/fetch ao vivo). Faixas com 0 cartas não entram (nada pra mostrar). */
export function resumoPrazo(cartas: CartaRelacao[]): FaixaPrazo[] {
  let imediato = 0;
  let ate30 = 0;
  let de31a90 = 0;
  let mais90 = 0;
  let variavel = 0;
  let naoInformado = 0;

  for (const c of cartas) {
    const tipo = (c.tipoTempo ?? "").trim();
    if (!tipo) {
      naoInformado++;
      continue;
    }
    if (/imediato/i.test(tipo)) {
      imediato++;
      continue;
    }
    if (!UNIDADE_TEMPORAL.test(tipo) || !c.tempoTotal || c.tempoTotal <= 0) {
      variavel++;
      continue;
    }
    const dias = diasAproximados(c.tempoTotal, tipo);
    if (dias <= 30) ate30++;
    else if (dias <= 90) de31a90++;
    else mais90++;
  }

  return [
    { label: "Acesso imediato", total: imediato },
    { label: "Até 30 dias", total: ate30 },
    { label: "31 a 90 dias", total: de31a90 },
    { label: "Mais de 90 dias", total: mais90 },
    { label: "Variável / conforme tabela", total: variavel },
    { label: "Não informado", total: naoInformado },
  ].filter((f) => f.total > 0);
}

// Ícone Material Icons por público — mesma taxonomia fechada de
// `CartaRelacao.publicoEspecifico` (Cidadão/Empresa/Gestão Pública/Servidor).
const ICONE_PUBLICO: Record<string, string> = {
  Cidadão: "person",
  Empresa: "business_center",
  "Gestão Pública": "account_balance",
  Servidor: "badge",
};

export type FaixaPublico = { label: string; total: number; icone: string };

/** Quantos serviços atendem cada público — uma carta pode servir mais de um
 * (campo é array), então a soma das faixas pode passar do total de cartas
 * ativas; isso é esperado, não é erro de contagem. */
export function resumoPublico(cartas: CartaRelacao[]): FaixaPublico[] {
  const contagem = new Map<string, number>();
  for (const c of cartas) {
    for (const p of c.publicoEspecifico) {
      contagem.set(p, (contagem.get(p) ?? 0) + 1);
    }
  }
  return [...contagem.entries()]
    .map(([label, total]) => ({ label, total, icone: ICONE_PUBLICO[label] ?? "groups" }))
    .sort((a, b) => b.total - a.total);
}

export type SetorGrupo = { setor: string; total: number };
export type OrgaoGrupo = { orgaoSigla: string; total: number; setores: SetorGrupo[] };

/** Serviços por órgão e, quando disponível, por setor dentro do órgão.
 * Setor só existe depois de rodar o pipeline com a SQL estendida (VPN) —
 * sem ele, cai pro agregado plano (InventarioOrgao.ativos) sem quebra por
 * setor. Mostra TODOS os órgãos, nunca só um top N: é inventário, não
 * ranking, e um corte escondido já confundiu (soma dos primeiros não
 * batendo com o total de cartas ativas pareceu bug de dado quando era só
 * truncamento). */
export function agruparOrgaosSetores(
  orgaos: InventarioOrgao[],
  cartas: CartaRelacao[],
): { grupos: OrgaoGrupo[]; temSetor: boolean } {
  const temSetor = cartas.some((c) => c.setor);

  if (!temSetor) {
    const grupos = orgaos
      .map((o) => ({ orgaoSigla: o.orgaoSigla, total: o.ativos, setores: [] as SetorGrupo[] }))
      .sort((a, b) => b.total - a.total);
    return { grupos, temSetor };
  }

  const porOrgao = new Map<string, Map<string, number>>();
  for (const c of cartas) {
    if (!c.setor) continue;
    const porSetor = porOrgao.get(c.orgaoSigla) ?? new Map<string, number>();
    porSetor.set(c.setor, (porSetor.get(c.setor) ?? 0) + 1);
    porOrgao.set(c.orgaoSigla, porSetor);
  }
  const grupos = [...porOrgao.entries()]
    .map(([orgaoSigla, porSetor]) => {
      const setores = [...porSetor.entries()]
        .map(([setor, total]) => ({ setor, total }))
        .sort((a, b) => b.total - a.total);
      return { orgaoSigla, total: setores.reduce((acc, s) => acc + s.total, 0), setores };
    })
    .sort((a, b) => b.total - a.total);
  return { grupos, temSetor };
}
