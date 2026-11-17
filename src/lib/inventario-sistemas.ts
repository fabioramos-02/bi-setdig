/**
 * Inventário de sistemas do Estado — tipos e cálculo. Leitura em lib/data.ts;
 * dados gerados por data-platform/build_inventario_sistemas.py.
 *
 * Três conceitos que não se misturam aqui:
 * - responsabilidade: órgão dono do sistema (`orgaoResponsavel`);
 * - uso: órgãos que declararam usar o sistema de outro órgão (`orgaosQueUsam`);
 * - integração técnica: troca de dados entre sistemas — NÃO está na planilha.
 */

export type Criterio = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8";
export type NivelCriticidade = { nivel: number; rotulo: string };

export type Sistema = {
  id: string;
  nome: string;
  sigla: string | null;
  descricao: string | null;
  orgaoResponsavel: string;
  gestor: string | null;
  temContato: boolean;
  setor: string | null;
  operadora: string | null;
  origem: string | null;
  fonteDono: string | null;
  responsavelInformado: string | null;
  dataAvaliacao: string | null;
  criterios: Record<Criterio, "S" | "N" | null>;
  criteriosRespondidos: number;
  pontos: number | null;
  pct: number | null;
  criticidade: NivelCriticidade | null;
  orgaosQueUsam: string[];
  nOrgaosQueUsam: number;
  nIndicacoes: number;
  arquivosOrigem: string[];
};

export type OrgaoInventario = {
  sigla: string;
  enviouInventario: boolean;
  sistemasResponsavel: number;
  sistemasDeOutrosQueUsa: number;
  orgaosQueUsamSeus: number;
};

/** Uma linha de um inventário enviado por órgão: de onde veio a citação. */
export type OrigemIndicacao = { arquivo: string | null; linha: number | null; nomeComoVeio: string | null };

export type Indicacao = {
  sistemaId: string;
  orgao: string;
  tipo: "proprio" | "outro";
  vezes: number;
  origens?: OrigemIndicacao[];
};

export type Pendencia = {
  tipo: string;
  item: string;
  oQueFalta: string | null;
  fontes: string[];
  sistemaId: string | null;
};

export type MetaInventario = {
  arquivo: string;
  versao: string | null;
  dataReferencia: string | null;
  criterios: { id: Criterio; pergunta: string }[];
};

export type DadosInventario = {
  sistemas: Sistema[];
  orgaos: OrgaoInventario[];
  indicacoes: Indicacao[];
  pendencias: Pendencia[];
  meta: MetaInventario | null;
};

export const DONO_DESCONHECIDO = "A IDENTIFICAR";

export const REGUA: { faixa: string; nivel: number; rotulo: string }[] = [
  { faixa: "0% a 20%", nivel: 1, rotulo: "Muito baixa" },
  { faixa: "21% a 40%", nivel: 2, rotulo: "Baixa" },
  { faixa: "41% a 60%", nivel: 3, rotulo: "Média" },
  { faixa: "61% a 80%", nivel: 4, rotulo: "Alta" },
  { faixa: "81% a 100%", nivel: 5, rotulo: "Crítica" },
];

const n = (v: number) => v.toLocaleString("pt-BR");
/** Percentual inteiro que nunca arredonda para 100% (ou 0%) sem ser exato:
 * 207 de 208 vira 99%, não 100%. */
export function pct(parte: number, total: number): number {
  if (total <= 0) return 0;
  const v = Math.round((parte / total) * 100);
  if (v === 100 && parte < total) return 99;
  if (v === 0 && parte > 0) return 1;
  return v;
}
const plural = (q: number, um: string, varios: string) => `${n(q)} ${q === 1 ? um : varios}`;

/** Órgãos "reais" (exclui o marcador de dono desconhecido). */
function orgaosValidos(orgaos: OrgaoInventario[]) {
  return orgaos.filter((o) => o.sigla !== DONO_DESCONHECIDO);
}

export function rotuloSistema(s: Pick<Sistema, "nome" | "sigla">): string {
  return s.sigla && s.sigla.toLowerCase() !== s.nome.toLowerCase() ? `${s.nome} (${s.sigla})` : s.nome;
}

// ---------------------------------------------------------------- Visão geral

export type Panorama = {
  nSistemas: number;
  nOrgaos: number;
  nEnviaram: number;
  naoEnviaram: string[];
  pctEnviaram: number;
  nOrgaosResponsaveis: number;
  nCompartilhados: number;
  pctCompartilhados: number;
  pctAvaliados: number;
  nIndicacoesUso: number;
  nAvaliados: number;
  nDonoDesconhecido: number;
  top3: { sigla: string; total: number }[];
  pctTop3: number;
  anchor: string;
  comoLer: string;
};

export function panoramaInventario(d: DadosInventario): Panorama {
  const orgaos = orgaosValidos(d.orgaos);
  const enviaram = orgaos.filter((o) => o.enviouInventario);
  const naoEnviaram = orgaos.filter((o) => !o.enviouInventario).map((o) => o.sigla);
  const ranking = rankingResponsabilidade(d.sistemas);
  const top3 = ranking.slice(0, 3);
  const somaTop3 = top3.reduce((s, x) => s + x.total, 0);
  const nCompartilhados = d.sistemas.filter((s) => s.nOrgaosQueUsam > 0).length;
  const nIndicacoesUso = d.indicacoes.filter((i) => i.tipo === "outro").reduce((s, i) => s + i.vezes, 0);
  const nAvaliados = d.sistemas.filter((s) => s.criticidade).length;
  const nDonoDesconhecido = d.sistemas.filter((s) => s.orgaoResponsavel === DONO_DESCONHECIDO).length;
  const pctTop3 = pct(somaTop3, d.sistemas.length);

  const anchor =
    `O Estado tem ${plural(d.sistemas.length, "sistema inventariado", "sistemas inventariados")}, ` +
    `sob responsabilidade de ${n(ranking.length)} órgãos. ` +
    (top3.length
      ? `${top3.map((t) => t.sigla).join(", ")} concentram ${pctTop3}% deles, e ${plural(nCompartilhados, "sistema é usado", "sistemas são usados")} também por outros órgãos.`
      : "");
  const comoLer =
    `Cada sistema conta uma vez, no órgão responsável por ele. ${n(enviaram.length)} de ${n(orgaos.length)} órgãos ` +
    `enviaram inventário; os sistemas dos demais aparecem porque outros órgãos disseram usá-los, então a lista ` +
    `desses órgãos pode estar incompleta. A criticidade ainda não foi avaliada ` +
    `(${n(nAvaliados)} de ${n(d.sistemas.length)} sistemas), por isso não há ranking de sistemas críticos.`;

  return {
    nSistemas: d.sistemas.length,
    nOrgaos: orgaos.length,
    nEnviaram: enviaram.length,
    naoEnviaram,
    pctEnviaram: pct(enviaram.length, orgaos.length),
    nOrgaosResponsaveis: ranking.length,
    nCompartilhados,
    pctCompartilhados: pct(nCompartilhados, d.sistemas.length),
    pctAvaliados: pct(nAvaliados, d.sistemas.length),
    nIndicacoesUso,
    nAvaliados,
    nDonoDesconhecido,
    top3,
    pctTop3,
    anchor,
    comoLer,
  };
}

export function rankingResponsabilidade(sistemas: Sistema[]): { sigla: string; total: number }[] {
  const cont = new Map<string, number>();
  for (const s of sistemas) {
    if (s.orgaoResponsavel === DONO_DESCONHECIDO) continue;
    cont.set(s.orgaoResponsavel, (cont.get(s.orgaoResponsavel) ?? 0) + 1);
  }
  return [...cont.entries()]
    .map(([sigla, total]) => ({ sigla, total }))
    .sort((a, b) => b.total - a.total || a.sigla.localeCompare(b.sigla));
}

export type PontoAtencao = { titulo: string; texto: string; tom: "alerta" | "info" };

export function pontosDeAtencao(d: DadosInventario): PontoAtencao[] {
  const p = panoramaInventario(d);
  const comp = completudeCampos(d.sistemas);
  const out: PontoAtencao[] = [];
  if (p.nAvaliados < p.nSistemas)
    out.push({
      titulo: "Criticidade ainda não avaliada",
      texto: `${n(p.nSistemas - p.nAvaliados)} de ${n(p.nSistemas)} sistemas sem as 8 perguntas de criticidade respondidas. Sem isso não dá para saber quais sistemas precisam de mais proteção.`,
      tom: "alerta",
    });
  if (p.naoEnviaram.length)
    out.push({
      titulo: `${plural(p.naoEnviaram.length, "órgão não enviou", "órgãos não enviaram")} inventário`,
      texto: `${p.naoEnviaram.join(", ")}. Os sistemas deles podem estar subcontados.`,
      tom: "alerta",
    });
  const desc = comp.find((c) => c.campo === "descricao");
  if (desc && desc.pct < 100)
    out.push({
      titulo: "Sistemas sem descrição",
      texto: `${n(desc.total - desc.preenchidos)} sistemas não dizem para que servem.`,
      tom: "info",
    });
  if (p.nDonoDesconhecido)
    out.push({
      titulo: "Sistema sem órgão responsável",
      texto: `${plural(p.nDonoDesconhecido, "sistema não tem", "sistemas não têm")} dono identificado em nenhuma fonte.`,
      tom: "alerta",
    });
  if (d.pendencias.length)
    out.push({
      titulo: `${plural(d.pendencias.length, "pendência", "pendências")} de validação`,
      texto: "Divergências de dono e informações a confirmar antes de usar o inventário como oficial.",
      tom: "info",
    });
  return out;
}

// ---------------------------------------------------------------- Por órgão

export type PerfilOrgao = {
  orgao: OrgaoInventario | null;
  proprios: Sistema[];
  usaDeOutros: Sistema[];
  /** órgãos que usam os sistemas deste órgão, com quantos sistemas cada um usa */
  quemUsaSeus: { sigla: string; sistemas: number }[];
  /** donos dos sistemas que este órgão usa, com quantos sistemas de cada */
  dependeDe: { sigla: string; sistemas: number }[];
  frase: string;
};

function contar(itens: string[]) {
  const m = new Map<string, number>();
  for (const i of itens) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()]
    .map(([sigla, sistemas]) => ({ sigla, sistemas }))
    .sort((a, b) => b.sistemas - a.sistemas || a.sigla.localeCompare(b.sigla));
}

export function perfilOrgao(sigla: string, d: DadosInventario): PerfilOrgao {
  const orgao = d.orgaos.find((o) => o.sigla === sigla) ?? null;
  const porNome = (a: Sistema, b: Sistema) => a.nome.localeCompare(b.nome);
  const proprios = d.sistemas.filter((s) => s.orgaoResponsavel === sigla).sort(porNome);
  const usaDeOutros = d.sistemas
    .filter((s) => s.orgaoResponsavel !== sigla && s.orgaosQueUsam.includes(sigla))
    .sort((a, b) => a.orgaoResponsavel.localeCompare(b.orgaoResponsavel) || porNome(a, b));
  const quemUsaSeus = contar(proprios.flatMap((s) => s.orgaosQueUsam.filter((o) => o !== sigla)));
  const dependeDe = contar(usaDeOutros.map((s) => s.orgaoResponsavel));

  const partes = [
    `${sigla} é responsável por ${plural(proprios.length, "sistema", "sistemas")}`,
    `usa ${plural(usaDeOutros.length, "sistema", "sistemas")} de outros órgãos`,
    `e ${plural(quemUsaSeus.length, "órgão usa", "órgãos usam")} os sistemas dele.`,
  ];
  let frase = `${partes[0]}, ${partes[1]} ${partes[2]}`;
  if (orgao && !orgao.enviouInventario)
    frase += " Como o órgão não enviou inventário, os números saem do que os outros órgãos informaram.";
  return { orgao, proprios, usaDeOutros, quemUsaSeus, dependeDe, frase };
}

// ---------------------------------------------------------------- Compartilhamento

export function rankingCompartilhados(sistemas: Sistema[], limite = 15): Sistema[] {
  return sistemas
    .filter((s) => s.nOrgaosQueUsam > 0)
    .sort((a, b) => b.nOrgaosQueUsam - a.nOrgaosQueUsam || b.nIndicacoes - a.nIndicacoes || a.nome.localeCompare(b.nome))
    .slice(0, limite);
}

/** Órgãos donos de sistemas usados por outros, por quantos órgãos distintos os usam. */
export function alcanceDosDonos(sistemas: Sistema[]): { sigla: string; orgaos: number; sistemas: number }[] {
  const m = new Map<string, { orgaos: Set<string>; sistemas: number }>();
  for (const s of sistemas) {
    if (s.nOrgaosQueUsam === 0 || s.orgaoResponsavel === DONO_DESCONHECIDO) continue;
    const e = m.get(s.orgaoResponsavel) ?? { orgaos: new Set<string>(), sistemas: 0 };
    s.orgaosQueUsam.filter((o) => o !== s.orgaoResponsavel).forEach((o) => e.orgaos.add(o));
    e.sistemas += 1;
    m.set(s.orgaoResponsavel, e);
  }
  return [...m.entries()]
    .map(([sigla, e]) => ({ sigla, orgaos: e.orgaos.size, sistemas: e.sistemas }))
    .sort((a, b) => b.orgaos - a.orgaos || b.sistemas - a.sistemas || a.sigla.localeCompare(b.sigla));
}

export type ResumoCompartilhamento = {
  nCompartilhados: number;
  nUsadosPor5Mais: number;
  lider: Sistema | null;
  anchor: string;
};

export function resumoCompartilhamento(sistemas: Sistema[]): ResumoCompartilhamento {
  const comp = sistemas.filter((s) => s.nOrgaosQueUsam > 0);
  const nUsadosPor5Mais = comp.filter((s) => s.nOrgaosQueUsam >= 5).length;
  const lider = rankingCompartilhados(sistemas, 1)[0] ?? null;
  const donos = alcanceDosDonos(sistemas);
  const anchor =
    `${plural(comp.length, "sistema é usado", "sistemas são usados")} por órgãos além do responsável; ` +
    `${plural(nUsadosPor5Mais, "deles chega", "deles chegam")} a 5 órgãos ou mais.` +
    (lider ? ` O mais citado é ${rotuloSistema(lider)}, da ${lider.orgaoResponsavel}, usado por ${n(lider.nOrgaosQueUsam)} órgãos.` : "") +
    (donos[0] ? ` ${donos[0].sigla} é o órgão cujos sistemas chegam a mais órgãos (${n(donos[0].orgaos)}).` : "");
  return { nCompartilhados: comp.length, nUsadosPor5Mais, lider, anchor };
}

// ---------------------------------------------------------------- Criticidade

export type ProgressoCriticidade = {
  total: number;
  avaliados: number;
  emAndamento: number;
  pctAvaliados: number;
  porOrgao: { sigla: string; total: number; avaliados: number }[];
  distribuicao: { nivel: number; rotulo: string; total: number }[];
  maisCriticos: Sistema[];
  /** criticidade × alcance — só sistemas avaliados */
  matriz: { sistema: Sistema; pct: number; orgaos: number }[];
};

export function progressoCriticidade(sistemas: Sistema[]): ProgressoCriticidade {
  const avaliados = sistemas.filter((s) => s.criticidade);
  const emAndamento = sistemas.filter((s) => !s.criticidade && s.criteriosRespondidos > 0).length;
  const porOrgaoMap = new Map<string, { total: number; avaliados: number }>();
  for (const s of sistemas) {
    const e = porOrgaoMap.get(s.orgaoResponsavel) ?? { total: 0, avaliados: 0 };
    e.total += 1;
    if (s.criticidade) e.avaliados += 1;
    porOrgaoMap.set(s.orgaoResponsavel, e);
  }
  return {
    total: sistemas.length,
    avaliados: avaliados.length,
    emAndamento,
    pctAvaliados: pct(avaliados.length, sistemas.length),
    porOrgao: [...porOrgaoMap.entries()]
      .map(([sigla, e]) => ({ sigla, ...e }))
      .sort((a, b) => b.total - a.total || a.sigla.localeCompare(b.sigla)),
    distribuicao: REGUA.map((r) => ({
      nivel: r.nivel,
      rotulo: r.rotulo,
      total: avaliados.filter((s) => s.criticidade?.nivel === r.nivel).length,
    })),
    maisCriticos: [...avaliados].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0) || b.nOrgaosQueUsam - a.nOrgaosQueUsam).slice(0, 10),
    matriz: avaliados.map((s) => ({ sistema: s, pct: s.pct ?? 0, orgaos: s.nOrgaosQueUsam })),
  };
}

// ---------------------------------------------------------------- Qualidade

export type CampoCompletude = { campo: string; rotulo: string; preenchidos: number; total: number; pct: number };

export function completudeCampos(sistemas: Sistema[]): CampoCompletude[] {
  const total = sistemas.length;
  const campos: [string, string, (s: Sistema) => boolean][] = [
    ["nome", "Nome do sistema", (s) => !!s.nome],
    ["orgao", "Órgão responsável", (s) => s.orgaoResponsavel !== DONO_DESCONHECIDO],
    ["gestor", "Gestor do sistema", (s) => !!s.gestor],
    ["contato", "Contato do gestor", (s) => s.temContato],
    ["sigla", "Sigla", (s) => !!s.sigla],
    ["descricao", "Descrição", (s) => !!s.descricao],
    ["criticidade", "Criticidade avaliada", (s) => !!s.criticidade],
  ];
  return campos.map(([campo, rotulo, ok]) => {
    const preenchidos = sistemas.filter(ok).length;
    return { campo, rotulo, preenchidos, total, pct: pct(preenchidos, total) };
  });
}

// ---------------------------------------------------------------- Catálogo

export type SituacaoCriticidade = "avaliado" | "em-andamento" | "pendente";

export function situacaoCriticidade(s: Sistema): SituacaoCriticidade {
  if (s.criticidade) return "avaliado";
  return s.criteriosRespondidos > 0 ? "em-andamento" : "pendente";
}

export function textoBusca(s: Sistema): string {
  return [s.nome, s.sigla, s.orgaoResponsavel, s.gestor, s.setor].filter(Boolean).join(" ");
}

export function filtrarCatalogo(
  sistemas: Sistema[],
  f: { orgao?: string; situacao?: SituacaoCriticidade | ""; uso?: "compartilhado" | "exclusivo" | "" },
): Sistema[] {
  return sistemas.filter(
    (s) =>
      (!f.orgao || s.orgaoResponsavel === f.orgao) &&
      (!f.situacao || situacaoCriticidade(s) === f.situacao) &&
      (!f.uso || (f.uso === "compartilhado" ? s.nOrgaosQueUsam > 0 : s.nOrgaosQueUsam === 0)),
  );
}

export function pendenciasDoSistema(s: Sistema, pendencias: Pendencia[]): Pendencia[] {
  return pendencias.filter((p) => p.sistemaId === s.id);
}

export type InventarioDeOrigem = {
  orgao: string;
  tipo: "proprio" | "outro";
  arquivos: { arquivo: string; linhas: { linha: number | null; nomeComoVeio: string | null }[] }[];
};

/** Árvore órgão → arquivo → linhas em que o sistema aparece nos inventários
 * enviados. O órgão responsável vem primeiro; depois os demais em ordem
 * alfabética. Sem indicações, cai na lista de arquivos da aba Inventário. */
export function inventariosDoSistema(s: Sistema, indicacoes: Indicacao[]): InventarioDeOrigem[] {
  const doSistema = indicacoes.filter((i) => i.sistemaId === s.id);
  if (doSistema.length === 0)
    return s.arquivosOrigem.length
      ? [{ orgao: "Inventários de origem", tipo: "outro", arquivos: s.arquivosOrigem.map((arquivo) => ({ arquivo, linhas: [] })) }]
      : [];
  return doSistema
    .map((i) => {
      const porArquivo = new Map<string, { linha: number | null; nomeComoVeio: string | null }[]>();
      for (const o of i.origens ?? []) {
        const chave = o.arquivo ?? "Arquivo não informado";
        porArquivo.set(chave, [...(porArquivo.get(chave) ?? []), { linha: o.linha, nomeComoVeio: o.nomeComoVeio }]);
      }
      return {
        orgao: i.orgao,
        tipo: i.tipo,
        arquivos: [...porArquivo.entries()].map(([arquivo, linhas]) => ({ arquivo, linhas })),
      };
    })
    .sort((a, b) =>
      Number(b.orgao === s.orgaoResponsavel) - Number(a.orgao === s.orgaoResponsavel) ||
      a.orgao.localeCompare(b.orgao) ||
      a.tipo.localeCompare(b.tipo),
    );
}

export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
