/**
 * Censo de serviços digitais — escala 0–5 (grau de digitalização) e cálculo
 * dos indicadores.
 *
 * Escala do dicionário da SGD (questionário autodeclarado por cada órgão,
 * planilha unificada → data-platform/build_censo.py). Mede quanto de cada carta
 * de serviço já dá pra resolver sem ir ao balcão (0 = só presencial → 5 = 100%
 * online e automático). Fonte da verdade dos rótulos, cores e regras de
 * agregação usadas nas telas do Censo Digital.
 *
 * Documentação da metodologia: docs/censo-maturidade.md
 */

/** Uma carta de serviço informada pelo órgão — 1 linha do censo. */
export type LinhaCensal = {
  id: string;
  titulo: string;
  setor: string | null;
  nivel: number | null; // 0–5; null = órgão não informou
  etapaPresencial: string | null; // o que ainda é feito no balcão
  demandaMensal: number | null; // solicitações/mês; null = não informado ou ilegível
  demandaTexto: string | null; // texto original quando demandaMensal é null
  slug: string | null;
  urlServico: string | null;
};

/** Um órgão: cabeçalho + cartas informadas. */
export type OrgaoCenso = {
  orgaoSigla: string;
  orgaoNome: string;
  cartas: LinhaCensal[];
};

/** Definição canônica da escala 0–5. `cor` é a rampa presencial→digital
 * (vermelho→verde). DS-MS não tem laranja nem verde-escuro próprios — essas
 * duas cores são extensões locais (o laranja já vinha do censo anterior).
 * `textoEscuro`: fundo claro (âmbar) pede texto escuro pra contraste. */
export const NIVEIS = [
  {
    nivel: 0, rotulo: "Só presencial", ehDigital: "Não", cor: "var(--ds-color-error)", textoEscuro: false,
    descricao: "Informação e atendimento só no balcão — o serviço nem aparece no Portal Único.",
  },
  {
    nivel: 1, rotulo: "Só a informação está online", ehDigital: "Não", cor: "#ff6200", textoEscuro: false,
    descricao: "Dá para se informar pela internet, mas todo o processo segue presencial.",
  },
  {
    nivel: 2, rotulo: "Parte online, pode virar digital", ehDigital: "Em parte", cor: "var(--ds-color-tertiary-600)", textoEscuro: true,
    descricao: "Alguma etapa já é pela internet, mas ainda há etapa presencial que pode ser transformada.",
  },
  {
    nivel: 3, rotulo: "Parte online, presença exigida por lei", ehDigital: "Em parte", cor: "var(--ds-color-info)", textoEscuro: false,
    descricao: "Alguma etapa já é pela internet, mas a lei exige uma etapa presencial.",
  },
  {
    nivel: 4, rotulo: "100% online para o cidadão", ehDigital: "Sim", cor: "var(--ds-color-success)", textoEscuro: false,
    descricao: "O cidadão começa e termina pela internet; por dentro, um servidor ainda analisa o pedido.",
  },
  {
    nivel: 5, rotulo: "100% online e automático", ehDigital: "Sim", cor: "color-mix(in srgb, var(--ds-color-success) 65%, black)", textoEscuro: false,
    descricao: "Pela internet do começo ao fim, sem depender de nenhum servidor público.",
  },
] as const;

/** Níveis em que o cidadão resolve sem ir ao balcão (% online). */
export const NIVEIS_DIGITAIS = [4, 5];
/** Níveis que podem virar digitais — a métrica de priorização. O 3 fica de
 * fora: a etapa presencial é exigência legal, não decisão do órgão. */
export const NIVEIS_OPORTUNIDADE = [1, 2];
export const NIVEL_TOPO = 5;

const naLista = (lista: number[], nivel: number | null) => nivel !== null && lista.includes(nivel);

export function corDoNivel(nivel: number | null): string {
  return NIVEIS.find((n) => n.nivel === nivel)?.cor ?? "var(--ds-color-neutral-400)";
}
export function rotuloDoNivel(nivel: number | null): string {
  return NIVEIS.find((n) => n.nivel === nivel)?.rotulo ?? "Não informado";
}
export function textoEscuroDoNivel(nivel: number | null): boolean {
  return NIVEIS.find((n) => n.nivel === nivel)?.textoEscuro ?? false;
}

export type NivelContagem = { nivel: number; rotulo: string; qtd: number; cor: string; textoEscuro: boolean };

export type ResumoCenso = {
  total: number;
  distribuicao: NivelContagem[]; // uma entrada por nível 0–5, sempre as 6
  nSemNivel: number; // cartas sem grau informado (fora da distribuição)
  nDigital: number;
  pctDigital: number; // % em nível 4–5, sobre as cartas COM grau informado
  nTopo: number; // nível 5 — automático
  oportunidades: number; // nº em nível 1–2
  nExigenciaLegal: number; // nº em nível 3
  /** Demanda mensal: base = cartas com número informado (ver comoLer na tela). */
  nComDemanda: number;
  demandaTotal: number;
  demandaDigital: number; // pedidos/mês que caem em serviço nível 4–5
  pctDemandaDigital: number; // % da demanda informada já atendida online (4–5)
};

const pct = (n: number, base: number) => (base ? Math.round((1000 * n) / base) / 10 : 0);

/** KPIs de um conjunto de cartas (órgão ou governo inteiro). */
export function resumirOrgao(cartas: LinhaCensal[]): ResumoCenso {
  const comNivel = cartas.filter((c) => c.nivel !== null);
  const distribuicao: NivelContagem[] = NIVEIS.map((n) => ({
    nivel: n.nivel,
    rotulo: n.rotulo,
    cor: n.cor,
    textoEscuro: n.textoEscuro,
    qtd: comNivel.filter((c) => c.nivel === n.nivel).length,
  }));
  const nDigital = comNivel.filter((c) => naLista(NIVEIS_DIGITAIS, c.nivel)).length;

  const comDemanda = cartas.filter((c) => c.demandaMensal !== null && c.nivel !== null);
  const demandaTotal = comDemanda.reduce((s, c) => s + (c.demandaMensal ?? 0), 0);
  const demandaDigital = comDemanda
    .filter((c) => naLista(NIVEIS_DIGITAIS, c.nivel))
    .reduce((s, c) => s + (c.demandaMensal ?? 0), 0);

  return {
    total: cartas.length,
    distribuicao,
    nSemNivel: cartas.length - comNivel.length,
    nDigital,
    pctDigital: pct(nDigital, comNivel.length),
    nTopo: comNivel.filter((c) => c.nivel === NIVEL_TOPO).length,
    oportunidades: comNivel.filter((c) => naLista(NIVEIS_OPORTUNIDADE, c.nivel)).length,
    nExigenciaLegal: comNivel.filter((c) => c.nivel === 3).length,
    nComDemanda: comDemanda.length,
    demandaTotal,
    demandaDigital,
    pctDemandaDigital: pct(demandaDigital, demandaTotal),
  };
}

export type Prioridade = LinhaCensal & { orgaoSigla: string };

/** Quadrantes da matriz impacto × esforço. Esforço vem do nível (≤ 2 = alto,
 * ainda falta quase tudo; ≥ 3 = baixo); impacto vem dos pedidos por mês
 * (acima da mediana do recorte = alto). */
export type Quadrante = "rapido" | "estruturante" | "oportuno" | "evitar";
export const NIVEL_MAX_ESFORCO_ALTO = 2;

export function quadranteDe(c: { nivel: number | null; demandaMensal: number | null }, mediana: number): Quadrante | null {
  if (c.nivel === null || c.demandaMensal === null) return null;
  const altoImpacto = c.demandaMensal > mediana;
  const altoEsforco = c.nivel <= NIVEL_MAX_ESFORCO_ALTO;
  if (altoImpacto) return altoEsforco ? "estruturante" : "rapido";
  return altoEsforco ? "evitar" : "oportuno";
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export type MatrizCenso = {
  mediana: number; // corte de impacto (pedidos/mês) deste recorte
  quadrantes: Record<Quadrante, Prioridade[]>; // cada um por demanda desc
  semDemanda: number; // cartas com nível mas sem número de pedidos — fora da matriz
  semNivel: number; // cartas sem grau informado — fora da matriz
};

/** Matriz impacto × esforço de um recorte (governo inteiro ou 1 órgão). A
 * mediana é do próprio recorte, então "alto impacto" é relativo: no órgão,
 * compara com os outros serviços dele. Inclui todos os níveis (0–5) — o
 * nível 5 cai em "baixo esforço" e a tela mostra quantos já estão no máximo. */
export function matrizImpactoEsforco(orgaos: OrgaoCenso[]): MatrizCenso {
  const cartas: Prioridade[] = orgaos.flatMap((o) => o.cartas.map((c) => ({ ...c, orgaoSigla: o.orgaoSigla })));
  const posicionaveis = cartas.filter((c) => c.nivel !== null && c.demandaMensal !== null);
  const corte = mediana(posicionaveis.map((c) => c.demandaMensal as number));
  const quadrantes: Record<Quadrante, Prioridade[]> = { rapido: [], estruturante: [], oportuno: [], evitar: [] };
  for (const c of posicionaveis) quadrantes[quadranteDe(c, corte) as Quadrante].push(c);
  for (const q of Object.values(quadrantes)) q.sort((a, b) => (b.demandaMensal ?? 0) - (a.demandaMensal ?? 0));
  return {
    mediana: corte,
    quadrantes,
    semDemanda: cartas.filter((c) => c.nivel !== null && c.demandaMensal === null).length,
    semNivel: cartas.filter((c) => c.nivel === null).length,
  };
}

export type OrgaoNoRanking = {
  sigla: string;
  nome: string;
  total: number;
  pctDigital: number;
  oportunidades: number;
  nTopo: number;
};

export type PanoramaCenso = ResumoCenso & {
  nOrgaos: number;
  orgaos: OrgaoNoRanking[]; // só órgãos com carta, por pctDigital desc
  semResposta: string[]; // siglas que não informaram nenhum serviço
};

/** Panorama do governo: % recalculado sobre o total geral (não média das
 * médias) + ranking dos órgãos. */
export function agregarGoverno(orgaos: OrgaoCenso[]): PanoramaCenso {
  const comCartas = orgaos.filter((o) => o.cartas.length > 0);
  const base = resumirOrgao(comCartas.flatMap((o) => o.cartas));

  const ranking: OrgaoNoRanking[] = comCartas
    .map((o) => {
      const r = resumirOrgao(o.cartas);
      return { sigla: o.orgaoSigla, nome: o.orgaoNome, total: r.total, pctDigital: r.pctDigital, oportunidades: r.oportunidades, nTopo: r.nTopo };
    })
    .sort((a, b) => b.pctDigital - a.pctDigital || b.total - a.total);

  return {
    ...base,
    nOrgaos: comCartas.length,
    orgaos: ranking,
    semResposta: orgaos.filter((o) => o.cartas.length === 0).map((o) => o.orgaoSigla),
  };
}
