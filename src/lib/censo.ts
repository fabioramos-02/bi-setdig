/**
 * Censo de maturidade digital — escala 0–4 e cálculo dos indicadores.
 *
 * Porte enxuto de `mapeamento-inicial-servicos-digitais/src/censo/{niveis,metricas}.py`.
 * A escala mede quanto de cada carta de serviço já dá pra resolver sem sair de
 * casa (0 = só no balcão → 4 = 100% pela internet). Fonte da verdade dos rótulos,
 * cores e regras de agregação usadas nas telas do Censo Digital.
 *
 * Documentação da metodologia: docs/censo-maturidade.md
 */

/** Uma carta de serviço já classificada — 1 linha do snapshot do censo. */
export type LinhaCensal = {
  id: string;
  titulo: string;
  nomePopular: string;
  slug: string;
  urlServico: string;
  urlExterno: string | null;
  nivel: number; // 0–4
  etapaBloqueio: string; // etapa que impede subir de nível ("" se nenhuma)
  falaSistema: boolean; // a carta menciona um sistema/plataforma digital
  sistemaCitado: string; // nome do sistema citado ("" se nenhum)
  justificativa: string; // por que recebeu esse nível
};

/** Snapshot de um órgão: cabeçalho + cartas classificadas. */
export type OrgaoCenso = {
  orgaoSigla: string;
  orgaoNome: string;
  cartas: LinhaCensal[];
};

/** Órgãos com snapshot publicado em datasets/censo/v1/<sigla>.json.
 * Adicionar órgão = gerar o JSON + registrar a sigla aqui (ver docs/censo-maturidade.md). */
export const SIGLAS_CENSO = ["iagro", "detran", "sead"] as const;

/** Definição canônica da escala 0–4. `cor` é a rampa presencial→digital
 * (vermelho→verde). DS-MS não tem laranja/dourado próprios — as duas cores
 * intermediárias são extensões locais documentadas (mesma decisão do censo
 * original). O resto vem de token do Design System. */
export const NIVEIS = [

  {
    nivel: 1, rotulo: "Informação online", ehDigital: "Não", cor: "#ff6200",
    descricao: "Apenas a informação sobre o serviço é online, todo o processo segue presencial."
  },
  {
    nivel: 2, rotulo: "Etapas digitais e presenciais", ehDigital: "Em parte", cor: "var(--ds-color-tertiary-600)",
    descricao: "Alguma etapa digital e presencial, mas pode ser transformado em serviço digital."
  },
  {
    nivel: 3, rotulo: "Etapa presencial por questões legais", ehDigital: "Em parte", cor: "var(--ds-color-info)",
    descricao: "Quase digital: 1 etapa presencial por questão legal."
  },
  {
    nivel: 4, rotulo: "100% digital, mas com back-office", ehDigital: "Sim", cor: "var(--ds-color-success)",
    descricao: "Resolve do começo ao fim sem sair de casa, mas passa por análise humana."
  },
] as const;

/** Níveis contados como "resolve pela internet" no indicador de % digital. */
export const NIVEIS_DIGITAIS = [3, 4];
/** Cartas a um passo de ficar 100% digitais — a métrica de priorização. */
export const NIVEIS_A_UM_PASSO = [2, 3];

export function corDoNivel(nivel: number): string {
  return NIVEIS.find((n) => n.nivel === nivel)?.cor ?? "var(--ds-color-neutral-400)";
}
export function rotuloDoNivel(nivel: number): string {
  return NIVEIS.find((n) => n.nivel === nivel)?.rotulo ?? "?";
}

export type NivelContagem = { nivel: number; rotulo: string; qtd: number; cor: string };

export type ResumoCenso = {
  total: number;
  distribuicao: NivelContagem[]; // uma entrada por nível 0–4, sempre as 5
  nDigital: number;
  pctDigital: number; // % em nível 3–4
  n4: number; // 100% pela internet
  aUmPasso: number; // nº em nível 2–3
  nFalaSistema: number;
};

/** KPIs de um órgão. Porte de metricas.py::resumir. */
export function resumirOrgao(cartas: LinhaCensal[]): ResumoCenso {
  const total = cartas.length;
  const distribuicao: NivelContagem[] = NIVEIS.map((n) => ({
    nivel: n.nivel,
    rotulo: n.rotulo,
    cor: n.cor,
    qtd: cartas.filter((c) => c.nivel === n.nivel).length,
  }));
  const nDigital = cartas.filter((c) => NIVEIS_DIGITAIS.includes(c.nivel)).length;
  return {
    total,
    distribuicao,
    nDigital,
    pctDigital: total ? Math.round((1000 * nDigital) / total) / 10 : 0,
    n4: cartas.filter((c) => c.nivel === 4).length,
    aUmPasso: cartas.filter((c) => NIVEIS_A_UM_PASSO.includes(c.nivel)).length,
    nFalaSistema: cartas.filter((c) => c.falaSistema).length,
  };
}

export type OrgaoNoRanking = {
  sigla: string;
  nome: string;
  total: number;
  pctDigital: number;
  aUmPasso: number;
  n4: number;
};

export type PanoramaCenso = ResumoCenso & {
  nOrgaos: number;
  orgaos: OrgaoNoRanking[]; // ordenados por pctDigital desc (mais → menos maduro)
};

/** Panorama do governo: soma os órgãos nível a nível e monta o ranking.
 * Porte de metricas.py::agregar (+ o ranking de indice.py). */
export function agregarGoverno(orgaos: OrgaoCenso[]): PanoramaCenso {
  const todas = orgaos.flatMap((o) => o.cartas);
  const base = resumirOrgao(todas);

  const ranking: OrgaoNoRanking[] = orgaos
    .map((o) => {
      const r = resumirOrgao(o.cartas);
      return { sigla: o.orgaoSigla, nome: o.orgaoNome, total: r.total, pctDigital: r.pctDigital, aUmPasso: r.aUmPasso, n4: r.n4 };
    })
    .sort((a, b) => b.pctDigital - a.pctDigital);

  return { ...base, nOrgaos: orgaos.length, orgaos: ranking };
}
