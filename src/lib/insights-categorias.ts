import type { CategoriaResumo } from "./catalogo-app.ts";
import type { FatiaCategoria } from "../components/charts/CategoryDonut.tsx";
import { iconeCategoria } from "./catalogo-app.ts";

/** Storytelling da aba "Categorias do app" — combina catálogo estático
 *  (categoria → nº de serviços) com acessos GA4 reclassificados por categoria
 *  no período do filtro. Funções puras, testáveis. */

export type RankingCategoria = {
  categoria: string;
  icone: string;
  totalServicos: number;
  acessos: number;
  sharePct: number;
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
      acessos: usos,
      sharePct: total > 0 ? (100 * usos) / total : 0,
    };
  });
  // Categorias sem match no catálogo (raro) vão pro fim como referência.
  for (const a of acessos) {
    if (!catalogo.some((c) => c.categoria === a.categoria)) {
      linhas.push({
        categoria: a.categoria,
        icone: iconeCategoria(a.categoria),
        totalServicos: 0,
        acessos: a.valor,
        sharePct: total > 0 ? (100 * a.valor) / total : 0,
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

/** Cobertura = % das categorias do catálogo com pelo menos 1 acesso. */
export function cobertura(r: RankingCategoria[]): number {
  const doCatalogo = r.filter((c) => c.totalServicos > 0);
  if (doCatalogo.length === 0) return 0;
  const comUso = doCatalogo.filter((c) => c.acessos > 0).length;
  return (100 * comUso) / doCatalogo.length;
}

/** Soma dos acessos identificados no período. */
export function totalAcessos(r: RankingCategoria[]): number {
  return r.reduce((a, c) => a + c.acessos, 0);
}

/** Share concentrado nas top-N categorias. */
export function topNSharePct(r: RankingCategoria[], n: number): number {
  return r.slice(0, n).reduce((a, c) => a + c.sharePct, 0);
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

  // Silenciosas: categorias do catálogo sem nenhum acesso
  const silenciosas = r.filter((c) => c.totalServicos > 0 && c.acessos === 0);
  if (silenciosas.length > 0) {
    out.push({
      severidade: silenciosas.length > 5 ? "alerta" : "info",
      texto: `${silenciosas.length} categoria${silenciosas.length > 1 ? "s não tiveram" : " não teve"} nenhum acesso no período selecionado.`,
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
