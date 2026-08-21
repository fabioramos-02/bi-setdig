/** Storytelling da aba "Botão Acessar Serviço" — funções puras, testáveis.
 *  Fluxo: Actions.getOutlinks?flat=1 cruzado com `urlExterno` do inventário.
 *  Foco em VOLUME de cliques (pedido da gestora). Sem pageviews → sem taxa
 *  de conversão nesta versão (ver ADR). */
import type { AcessoBotaoCarta } from "./data";

export function totalCliques(cartas: AcessoBotaoCarta[]): number {
  return cartas.reduce((acc, c) => acc + c.cliques, 0);
}

/** Domínios destino agregados (soma cliques de todas cartas que apontam pro
 *  mesmo host). Ex.: se 5 cartas do DETRAN apontam pra meudetran.ms.gov.br
 *  em URLs diferentes, agrupa tudo em "meudetran.ms.gov.br". */
export type DestinoAgregado = { host: string; cliques: number; pct: number; cartas: number };

export function destinosPorHost(cartas: AcessoBotaoCarta[], n = 5): DestinoAgregado[] {
  const grupos = new Map<string, { cliques: number; cartas: number }>();
  for (const c of cartas) {
    const host = hostDe(c.urlExterno);
    const g = grupos.get(host) ?? { cliques: 0, cartas: 0 };
    g.cliques += c.cliques;
    g.cartas += 1;
    grupos.set(host, g);
  }
  const total = [...grupos.values()].reduce((a, g) => a + g.cliques, 0);
  return [...grupos.entries()]
    .map(([host, g]) => ({
      host,
      cliques: g.cliques,
      pct: total > 0 ? Math.round((g.cliques / total) * 10_000) / 100 : 0,
      cartas: g.cartas,
    }))
    .sort((a, b) => b.cliques - a.cliques)
    .slice(0, n);
}

function hostDe(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Ranking por órgão — soma cliques das cartas de cada órgão. */
export type ResumoOrgao = {
  orgaoSigla: string;
  cartas: number;
  cliques: number;
  destinoPrincipal: string | null;
  cliquesDestinoPrincipal: number;
};

export function agregarPorOrgao(cartas: AcessoBotaoCarta[]): ResumoOrgao[] {
  const grupos = new Map<string, AcessoBotaoCarta[]>();
  for (const c of cartas) {
    const sigla = c.orgaoSigla ?? "Sem órgão";
    (grupos.get(sigla) ?? grupos.set(sigla, []).get(sigla)!).push(c);
  }
  const resumos: ResumoOrgao[] = [];
  for (const [sigla, lista] of grupos) {
    const cliques = lista.reduce((a, c) => a + c.cliques, 0);
    const cartaLider = lista.reduce((max, c) => (c.cliques > max.cliques ? c : max), lista[0]);
    resumos.push({
      orgaoSigla: sigla,
      cartas: lista.length,
      cliques,
      destinoPrincipal: cartaLider.titulo,
      cliquesDestinoPrincipal: cartaLider.cliques,
    });
  }
  return resumos.sort((a, b) => b.cliques - a.cliques);
}

export function orgaosDisponiveis(cartas: AcessoBotaoCarta[]): string[] {
  const set = new Set<string>();
  for (const c of cartas) if (c.orgaoSigla) set.add(c.orgaoSigla);
  return [...set].sort();
}

export type FraseAncoraAcessos = {
  fraseAncora: string;
  comoLer: string;
  semDado: boolean;
};

// ponytail: sem consumidor após remoção do StoryCard do topo em AcessarServicoTab. Remover na próxima limpeza se ninguém adotar.
export function fraseAncoraAcessos(cartas: AcessoBotaoCarta[], orgao?: string | null): FraseAncoraAcessos {
  if (cartas.length === 0) {
    return {
      fraseAncora: orgao
        ? `Ainda não há cliques no botão Acessar serviço das cartas de ${orgao} no período selecionado.`
        : "Ainda não há dado suficiente sobre cliques em Acessar serviço no período selecionado.",
      comoLer:
        "Cada carta com sistema externo cadastrado (URL de destino) aparece aqui quando o cidadão clica em Acessar serviço. Cartas sem sistema externo não entram no ranking.",
      semDado: true,
    };
  }
  const total = totalCliques(cartas);
  const lider = cartas[0];
  const escopo = orgao ? `cartas de ${orgao}` : `${cartas.length} cartas com cliques`;
  return {
    fraseAncora: `${total.toLocaleString("pt-BR")} cliques em Acessar serviço nas ${escopo}. Líder: ${lider.titulo}, com ${lider.cliques.toLocaleString("pt-BR")} cliques.`,
    comoLer: `Cada clique representa 1 cidadão que abriu a carta e prosseguiu pro sistema que executa o serviço (${lider.urlExterno}). Cartas sem sistema externo cadastrado no admin não aparecem aqui — o campo urlExterno é a chave que liga a carta ao Matomo.`,
    semDado: false,
  };
}
