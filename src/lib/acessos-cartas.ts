/**
 * Acessos às cartas de serviço — agregação por órgão, área e setor, e o
 * ranking das cartas. Puro (sem servidor): serve a busca ao vivo
 * (lib/server/cartas-visitas.ts) e a base gravada pela tarefa diária
 * (datasets/matomo/v1/acessos-cartas.json), usada quando o período é o
 * corrente ou quando a busca ao vivo falha.
 */
import type { CartaRelacao } from "./data.ts";

const PORTAL_BASE = "https://www.ms.gov.br";

export function urlDaCarta(carta: Pick<CartaRelacao, "categoria" | "slug">): string {
  return `${PORTAL_BASE}/${carta.categoria}/${carta.slug}`;
}

export type CartaVisita = {
  titulo: string;
  orgaoSigla: string;
  setor: string | null;
  categoria: string;
  slug: string;
  visitas: number;
  url: string;
};
export type RankVisita = { rotulo: string; visitas: number };
/** Par compacto gravado por período: [slug, visitas]. */
export type AcessoSlug = [string, number];

export const ranquear = (m: Map<string, number>): RankVisita[] =>
  [...m.entries()].map(([rotulo, visitas]) => ({ rotulo, visitas })).sort((a, b) => b.visitas - a.visitas);

export function agregarPorCarta(porCarta: CartaVisita[]): {
  porOrgao: RankVisita[];
  porCategoria: RankVisita[];
  porSetor: RankVisita[];
} {
  const orgao = new Map<string, number>();
  const categoria = new Map<string, number>();
  const setor = new Map<string, number>();
  for (const c of porCarta) {
    orgao.set(c.orgaoSigla, (orgao.get(c.orgaoSigla) ?? 0) + c.visitas);
    categoria.set(c.categoria, (categoria.get(c.categoria) ?? 0) + c.visitas);
    // Chave composta (setor + sigla): setores homônimos em órgãos diferentes
    // não se somam, e o rótulo já sai pronto ("Financeiro — SEFAZ").
    if (c.setor) {
      const chave = `${c.setor} — ${c.orgaoSigla}`;
      setor.set(chave, (setor.get(chave) ?? 0) + c.visitas);
    }
  }
  return { porOrgao: ranquear(orgao), porCategoria: ranquear(categoria), porSetor: ranquear(setor) };
}

/** Monta as cartas com acesso a partir dos pares gravados, com título,
 * órgão e setor do inventário (slug sem carta ativa fica de fora). */
export function cartasDosAcessos(pares: AcessoSlug[], relacao: CartaRelacao[]): CartaVisita[] {
  const porSlug = new Map(relacao.filter((c) => c.ativo).map((c) => [c.slug, c]));
  const cartas: CartaVisita[] = [];
  for (const [slug, visitas] of pares) {
    const c = porSlug.get(slug);
    if (!c) continue;
    cartas.push({
      titulo: c.titulo,
      orgaoSigla: c.orgaoSigla,
      setor: c.setor ?? null,
      categoria: c.categoria!,
      slug,
      visitas,
      url: urlDaCarta({ categoria: c.categoria!, slug }),
    });
  }
  return cartas.sort((a, b) => b.visitas - a.visitas);
}

/** As `n` cartas mais acessadas de um órgão (todas, sem órgão). */
export function maisAcessadas(porCarta: CartaVisita[], orgaoSigla: string | null, n = 10): CartaVisita[] {
  return (orgaoSigla ? porCarta.filter((c) => c.orgaoSigla === orgaoSigla) : porCarta).slice(0, n);
}
