/** Storytelling da aba "Botão Acessar Serviço" — funções puras, testáveis.
 *  Todo cálculo aqui, nada nos .tsx (regra AGENTS.md::convencoes). */
import type { AcessoBotaoCarta } from "./data";

export type FaixaConversao = "alta" | "media" | "baixa" | "sem-dado";

/** Regra: ≥50% carta cumpre a função de porta pro serviço; 20-49% cidadão
 *  informa mas desiste; <20% carta pode estar confundindo ou destino quebrado. */
export function faixaConversao(pct: number): FaixaConversao {
  if (pct <= 0) return "sem-dado";
  if (pct >= 50) return "alta";
  if (pct >= 20) return "media";
  return "baixa";
}

export function corDaFaixa(f: FaixaConversao): string {
  if (f === "alta") return "var(--ds-color-success, #16a34a)";
  if (f === "media") return "var(--ds-color-warning, #d97706)";
  if (f === "baixa") return "var(--ds-color-danger, #dc2626)";
  return "var(--ds-color-text-muted, #64748b)";
}

export function rotuloDaFaixa(f: FaixaConversao): string {
  if (f === "alta") return "conversão alta";
  if (f === "media") return "conversão média";
  if (f === "baixa") return "conversão baixa";
  return "sem dado";
}

/** Média ponderada = soma de cliques / soma de views. Média simples de
 *  taxas mascara: uma carta pequena com 100% pesa igual a uma grande com
 *  10%. Ponderada mostra a experiência real do cidadão. */
export function taxaMediaPonderada(cartas: AcessoBotaoCarta[]): number {
  const totalViews = cartas.reduce((a, c) => a + c.views, 0);
  const totalCliques = cartas.reduce((a, c) => a + c.cliquesTotais, 0);
  return totalViews > 0 ? Math.round((totalCliques / totalViews) * 10_000) / 100 : 0;
}

export function cartasComBaixaConversao(cartas: AcessoBotaoCarta[], minViews = 100): AcessoBotaoCarta[] {
  return cartas
    .filter((c) => c.views >= minViews && faixaConversao(c.taxaConversaoPct) === "baixa")
    .sort((a, b) => b.views - a.views);
}

export function cartasComAltaConversao(cartas: AcessoBotaoCarta[], minCliques = 20): AcessoBotaoCarta[] {
  return cartas
    .filter((c) => c.cliquesTotais >= minCliques && faixaConversao(c.taxaConversaoPct) === "alta")
    .sort((a, b) => b.cliquesTotais - a.cliquesTotais);
}

/** Destinos externos únicos entre todas as cartas (agrega por URL). Serve pra
 *  entender pra onde a maior parte do fluxo do portal vai — Meu Detran,
 *  e-Fazenda, etc. Não conta "Outros destinos" (bucket de cauda por carta). */
export function destinosAgregados(cartas: AcessoBotaoCarta[], n = 5): { url: string; cliques: number; pct: number }[] {
  const somas = new Map<string, number>();
  for (const carta of cartas) {
    for (const d of carta.destinos) {
      if (d.url === "Outros destinos") continue;
      somas.set(d.url, (somas.get(d.url) ?? 0) + d.cliques);
    }
  }
  const ordenado = [...somas.entries()]
    .map(([url, cliques]) => ({ url, cliques }))
    .sort((a, b) => b.cliques - a.cliques);
  const total = ordenado.reduce((a, d) => a + d.cliques, 0);
  return ordenado.slice(0, n).map((d) => ({
    ...d,
    pct: total > 0 ? Math.round((d.cliques / total) * 10_000) / 100 : 0,
  }));
}

export type FraseAncoraAcessos = {
  fraseAncora: string;
  comoLer: string;
  semDado: boolean;
};

/** Frase-âncora executiva pra topo da aba. Segue molde AGENTS.md: entrega
 *  a conclusão em 1 frase, o gráfico ilustra a frase. */
export function fraseAncoraAcessos(cartas: AcessoBotaoCarta[]): FraseAncoraAcessos {
  if (cartas.length === 0) {
    return {
      fraseAncora: "Ainda não há dado suficiente sobre cliques em Acessar serviço no período selecionado.",
      comoLer:
        "Assim que o portal registrar visitas com cliques em links externos das cartas, esta aba mostra quantos cidadãos chegam ao sistema que resolve o serviço.",
      semDado: true,
    };
  }
  const taxa = taxaMediaPonderada(cartas);
  const lider = cartas[0];
  const totalCliques = cartas.reduce((a, c) => a + c.cliquesTotais, 0);
  const totalViews = cartas.reduce((a, c) => a + c.views, 0);
  return {
    fraseAncora: `Das ${cartas.length} cartas mais visitadas, ${taxa.toFixed(1)}% dos cidadãos chegam a clicar em Acessar serviço — foram ${totalCliques.toLocaleString("pt-BR")} cliques em ${totalViews.toLocaleString("pt-BR")} visitas.`,
    comoLer: `A conversão é a proporção entre quem abriu a carta e quem prosseguiu pro sistema que resolve o serviço (por exemplo, ${lider.titulo} envia ${lider.taxaConversaoPct.toFixed(1)}% das visitas pro destino externo). Conversão alta significa que a carta cumpre bem o papel de porta pro serviço; baixa pode indicar que o cidadão desiste, não encontra o botão ou o destino está fora do ar.`,
    semDado: false,
  };
}
