import type { CategoriaResumo } from "./catalogo-app.ts";
import type { FatiaCategoria } from "../components/charts/CategoryDonut.tsx";
import type { CategoriaOrgaos } from "./data.ts";
import { iconeCategoria } from "./catalogo-app.ts";

/** Storytelling da aba "Categorias do app" — combina catálogo estático
 *  (categoria → nº de serviços) com acessos GA4 reclassificados por categoria
 *  no período do filtro. Funções puras, testáveis. */

export type RankingCategoria = {
  categoria: string;
  icone: string;
  totalServicos: number;
  ativosServicos: number;
  /** Todos os serviços da categoria estão marcados como inativos no catálogo. */
  inativa: boolean;
  acessos: number;
  sharePct: number;
  /** 100% dos serviços é `tipo: "web"` e catálogo tem no máx 2 — abre navegador
   *  direto sem gerar screen_view no app. "0 acessos" nesses casos é design,
   *  não bug. Usado pra UI mostrar badge "atalho web" em vez de "0". */
  soAtalhoWeb: boolean;
};

export type PontoAtencaoCategoria = {
  severidade: "alerta" | "atencao" | "info";
  texto: string;
};

/** Junta catálogo + acessos e ordena por acessos (desc). Categorias sem uso
 *  aparecem no fim com acessos=0. */
export function ranking(
  catalogo: CategoriaResumo[],
  acessos: FatiaCategoria[],
): RankingCategoria[] {
  const mapaAcessos = new Map(acessos.map((a) => [a.categoria, a.valor]));
  const total = acessos.reduce((a, f) => a + f.valor, 0);
  const linhas: RankingCategoria[] = catalogo.map((c) => {
    const usos = mapaAcessos.get(c.categoria) ?? 0;
    return {
      categoria: c.categoria,
      icone: c.icone,
      totalServicos: c.total,
      ativosServicos: c.ativo,
      inativa: c.total > 0 && c.ativo === 0,
      acessos: usos,
      sharePct: total > 0 ? (100 * usos) / total : 0,
      // Atalho web: 100% dos serviços web E até 2 serviços na categoria.
      // Ex.: MS.gov (1 web), Diário Oficial (1 web), Notícias (1 web),
      // Nota Premiada (1 web). Clicar abre navegador — sem screen_view.
      soAtalhoWeb: c.total > 0 && c.nativo === 0 && c.total <= 2,
    };
  });
  // Categorias sem match no catálogo (raro) vão pro fim como referência.
  for (const a of acessos) {
    if (!catalogo.some((c) => c.categoria === a.categoria)) {
      linhas.push({
        categoria: a.categoria,
        icone: iconeCategoria(a.categoria),
        totalServicos: 0,
        ativosServicos: 0,
        inativa: false,
        acessos: a.valor,
        sharePct: total > 0 ? (100 * a.valor) / total : 0,
        soAtalhoWeb: false,
      });
    }
  }
  return linhas.sort((a, b) => b.acessos - a.acessos);
}

export function categoriaLider(r: RankingCategoria[]): RankingCategoria | null {
  const primeira = r[0];
  if (!primeira || primeira.acessos === 0) return null;
  return primeira;
}

/** Cauda longa: categorias com < 5% cada, somadas. */
export function cauda(r: RankingCategoria[]): { qtd: number; sharePct: number } {
  const cauda = r.filter((c) => c.sharePct > 0 && c.sharePct < 5);
  return {
    qtd: cauda.length,
    sharePct: cauda.reduce((a, c) => a + c.sharePct, 0),
  };
}

/** Cobertura = % das categorias do catálogo MEDÍVEIS (exclui atalhos web,
 *  que não geram screen_view por design) com pelo menos 1 acesso. */
export function cobertura(r: RankingCategoria[]): number {
  const mediveis = r.filter((c) => c.totalServicos > 0 && !c.soAtalhoWeb);
  if (mediveis.length === 0) return 0;
  const comUso = mediveis.filter((c) => c.acessos > 0).length;
  return (100 * comUso) / mediveis.length;
}

/** Soma dos acessos identificados no período. */
export function totalAcessos(r: RankingCategoria[]): number {
  return r.reduce((a, c) => a + c.acessos, 0);
}

/** Share concentrado nas top-N categorias. */
export function topNSharePct(r: RankingCategoria[], n: number): number {
  return r.slice(0, n).reduce((a, c) => a + c.sharePct, 0);
}

/** Órgãos únicos envolvidos nas categorias do catálogo — soma o conjunto
 *  de siglas do mapa, ignorando categorias sem responsável mapeado. */
export function contagemOrgaosUnicos(
  mapa: CategoriaOrgaos,
  categorias: RankingCategoria[],
): { total: number; distintos: string[] } {
  const set = new Set<string>();
  for (const c of categorias) {
    for (const sigla of mapa[c.categoria] ?? []) set.add(sigla);
  }
  const distintos = [...set];
  return { total: distintos.length, distintos };
}

export type OrgaoResponsavel = {
  sigla: string;
  categorias: string[];
  totalServicos: number;
  totalAtivos: number;
  acessos: number;
  sharePct: number;
};

/** Inverte o mapa categoria→[órgãos] em órgão→[categorias]. Agrega
 *  serviços/acessos por órgão pra ranquear responsabilidade e uso.
 *  Órgão que aparece em N categorias soma tudo — dupla contagem é
 *  intencional (mede alcance/carga institucional, não visitantes únicos). */
export function porOrgao(
  mapa: CategoriaOrgaos,
  rankings: RankingCategoria[],
): OrgaoResponsavel[] {
  const idx = new Map(rankings.map((r) => [r.categoria, r]));
  const total = rankings.reduce((a, r) => a + r.acessos, 0);
  const acc = new Map<string, OrgaoResponsavel>();
  for (const [categoria, orgaos] of Object.entries(mapa)) {
    const r = idx.get(categoria);
    for (const sigla of orgaos) {
      const cur =
        acc.get(sigla) ??
        { sigla, categorias: [], totalServicos: 0, totalAtivos: 0, acessos: 0, sharePct: 0 };
      cur.categorias.push(categoria);
      cur.totalServicos += r?.totalServicos ?? 0;
      cur.totalAtivos += r?.ativosServicos ?? 0;
      cur.acessos += r?.acessos ?? 0;
      acc.set(sigla, cur);
    }
  }
  for (const o of acc.values()) {
    o.sharePct = total > 0 ? (100 * o.acessos) / total : 0;
    o.categorias.sort();
  }
  return [...acc.values()].sort(
    (a, b) => b.acessos - a.acessos || b.categorias.length - a.categorias.length || a.sigla.localeCompare(b.sigla),
  );
}

export function fraseAncoraCategoria(r: RankingCategoria[]): string {
  const lider = categoriaLider(r);
  if (!lider) return "Ainda não há acessos identificados por categoria no período selecionado.";
  const top5 = topNSharePct(r, 5);
  return `${lider.categoria} lidera com ${lider.sharePct.toFixed(1)}% dos acessos. As 5 categorias mais usadas concentram ${top5.toFixed(0)}% do total.`;
}

/** Semáforo de concentração: quanto mais peso nas 3 primeiras, mais concentrado. */
export type NivelSaudeConcentracao = "verde" | "amarelo" | "vermelho";
export function saudeConcentracao(r: RankingCategoria[]): { nivel: NivelSaudeConcentracao; texto: string } {
  const top3 = topNSharePct(r, 3);
  if (top3 === 0) return { nivel: "amarelo", texto: "Sem acessos identificados para avaliar a distribuição." };
  if (top3 < 60) return { nivel: "verde", texto: "Uso bem distribuído entre categorias." };
  if (top3 < 85) return { nivel: "amarelo", texto: "Uso moderadamente concentrado — 3 categorias dominam a maior parte." };
  return { nivel: "vermelho", texto: "Uso muito concentrado — quase tudo em poucas categorias, cauda longa fraca." };
}

export function pontosAtencaoCategorias(r: RankingCategoria[]): PontoAtencaoCategoria[] {
  const out: PontoAtencaoCategoria[] = [];
  const total = totalAcessos(r);
  if (total === 0) return out;

  // Inertes: categorias com >= 5 serviços mas < 1% dos acessos
  const inertes = r.filter((c) => c.totalServicos >= 5 && c.sharePct < 1 && c.acessos > 0);
  if (inertes.length > 0) {
    const nomes = inertes.slice(0, 3).map((c) => c.categoria).join(", ");
    out.push({
      severidade: "atencao",
      texto: `${inertes.length} categoria${inertes.length > 1 ? "s têm" : " tem"} 5 ou mais serviços mas menos de 1% dos acessos (${nomes}) — vale investigar visibilidade ou relevância.`,
    });
  }

  // Silenciosas: categorias medíveis (não atalho web) sem nenhum acesso
  const silenciosas = r.filter((c) => c.totalServicos > 0 && !c.soAtalhoWeb && c.acessos === 0);
  if (silenciosas.length > 0) {
    out.push({
      severidade: silenciosas.length > 5 ? "alerta" : "info",
      texto: `${silenciosas.length} categoria${silenciosas.length > 1 ? "s não tiveram" : " não teve"} nenhum acesso no período selecionado.`,
    });
  }

  // Atalhos web: informativo, não é bug — só pra chefe saber que existem.
  const atalhos = r.filter((c) => c.soAtalhoWeb);
  if (atalhos.length > 0) {
    const nomes = atalhos.map((a) => a.categoria).join(", ");
    out.push({
      severidade: "info",
      texto: `${atalhos.length} categoria${atalhos.length > 1 ? "s são" : " é"} atalho externo (${nomes}) — abre navegador direto, sem passar por tela do app, então não gera medição no GA4.`,
    });
  }

  // Quentes: categorias com <= 2 serviços mas >= 10% dos acessos
  const quentes = r.filter((c) => c.totalServicos > 0 && c.totalServicos <= 2 && c.sharePct >= 10);
  if (quentes.length > 0) {
    const nomes = quentes.map((c) => c.categoria).join(", ");
    out.push({
      severidade: "info",
      texto: `${nomes}: poucos serviços concentram grande parte dos acessos — área de alta relevância.`,
    });
  }

  // Concentração perigosa: top-1 acima de 40%
  const lider = categoriaLider(r);
  if (lider && lider.sharePct > 40) {
    out.push({
      severidade: "alerta",
      texto: `${lider.categoria} sozinha responde por ${lider.sharePct.toFixed(1)}% dos acessos — dependência alta de uma única área.`,
    });
  }

  return out;
}
