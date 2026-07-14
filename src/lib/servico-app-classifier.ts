import type { Servico, ServicoCatalogo } from "./data";
import type { FatiaCategoria } from "@/components/charts/CategoryDonut";

/**
 * O GA4 registra `screen_view` igual pra tela de categoria/menu, submenu e
 * serviço-folha — não há hierarquia na métrica (ver extract/ga4.py::get_services,
 * espelhado em lib/server/ga4-client.ts). "Ranking de serviços" acabava
 * listando categoria ("Servidor Público") lado a lado com serviço real
 * ("Contracheque"). Fix definitivo pede custom dimension nova no app — fora
 * do nosso alcance aqui. Este módulo reclassifica cruzando os nomes de tela
 * contra o catálogo estático (`catalogo-servicos.json`), que já distingue
 * categoria × serviço.
 *
 * ponytail: match exato após normalizar (sem acento/caixa), sem fuzzy —
 * nomes que divergem por texto entre GA4 e catálogo (ex. "Cartão SUS Online"
 * vs "Cartão do SUS Online") caem em "não identificado" em vez de casar.
 * Upgrade pra matching aproximado só se essa fatia se mostrar grande com
 * dado real.
 */

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Nome de tela do catálogo: pega o serviço-folha real. Entradas no formato
 * "Submenu > Serviço" (25 das 121 hoje) usam só o último segmento — o resto
 * (96) já é o nome direto. */
export function folhaDe(servico: string): string {
  const partes = servico.split(">");
  return partes[partes.length - 1].trim();
}

export type ResultadoClassificacao = {
  servicosFolha: Servico[];
  categorias: FatiaCategoria[];
  naoIdentificadoPct: number;
};

export function classificarAcessosApp(rows: Servico[], catalogo: ServicoCatalogo[]): ResultadoClassificacao {
  const categoriasSet = new Set(catalogo.map((c) => normalizar(c.categoria)));
  const folhaMap = new Map<string, { folha: string; categoria: string }>();
  for (const c of catalogo) {
    const folha = folhaDe(c.servico);
    folhaMap.set(normalizar(folha), { folha, categoria: c.categoria });
  }

  const folhaAcessos = new Map<string, number>();
  const categoriaAcessos = new Map<string, number>();
  let naoIdentificado = 0;
  let total = 0;

  for (const row of rows) {
    total += row.acessos;
    const chave = normalizar(row.servico);

    if (categoriasSet.has(chave)) {
      // Acesso direto na tela-categoria (menu) — conta pra "categoria mais usada".
      categoriaAcessos.set(row.servico, (categoriaAcessos.get(row.servico) ?? 0) + row.acessos);
      continue;
    }

    const folha = folhaMap.get(chave);
    if (folha) {
      // Serviço-folha real — conta no ranking de serviços E soma na categoria-mãe
      // (usar quantos acessaram a área toda, não só quem parou no menu).
      folhaAcessos.set(folha.folha, (folhaAcessos.get(folha.folha) ?? 0) + row.acessos);
      categoriaAcessos.set(folha.categoria, (categoriaAcessos.get(folha.categoria) ?? 0) + row.acessos);
      continue;
    }

    // Submenu intermediário (ex. "Portal do Servidor") ou nome sem match no
    // catálogo — não força em nenhum dos dois rankings.
    naoIdentificado += row.acessos;
  }

  const servicosFolha = [...folhaAcessos.entries()]
    .map(([servico, acessos]) => ({ servico, acessos }))
    .sort((a, b) => b.acessos - a.acessos);

  const totalCategorias = [...categoriaAcessos.values()].reduce((acc, v) => acc + v, 0);
  const categorias = [...categoriaAcessos.entries()]
    .map(([categoria, valor]) => ({ categoria, valor, participacaoPct: totalCategorias > 0 ? (valor / totalCategorias) * 100 : 0 }))
    .sort((a, b) => b.valor - a.valor);

  return { servicosFolha, categorias, naoIdentificadoPct: total > 0 ? (naoIdentificado / total) * 100 : 0 };
}

/** Lookup nome-normalizado(folha)->acessos, pra CategoriasTab achar o número
 * de um serviço do catálogo sem duplicar match: `contagem.get(normalizar(folhaDe(s.servico)))`. */
export function contagemPorServico(servicosFolha: Servico[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const s of servicosFolha) mapa.set(normalizar(s.servico), s.acessos);
  return mapa;
}

/** Lookup categoria->acessos (chave já é o nome exato do catálogo, sem
 * normalizar — `categorias` vem de `classificarAcessosApp`, que usa o mesmo
 * `c.categoria` do catálogo). */
export function contagemPorCategoria(categorias: FatiaCategoria[]): Map<string, number> {
  return new Map(categorias.map((c) => [c.categoria, c.valor]));
}
