import type { TermoBusca } from "./data";
import type { InsightBusca } from "./insights";

/**
 * Leitura executiva da busca interna do portal — agrupa termo por assunto e
 * monta a narrativa "o que aconteceu → o que significa → oportunidade"
 * (ver AGENTS.md "BI de gestão"). Gestor pensa em assunto de interesse do
 * cidadão, não em termo de busca isolado.
 */

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Regras pequenas e explícitas, não classificador estatístico — mesmo
 * espírito de EXCLUIR_URLS (matomo-transform.ts): lista curta, legível,
 * fácil de auditar. Termo que não casa cai em "Outros assuntos" (honesto —
 * nunca força um tema errado só pra não sobrar categoria). */
const TEMAS: { tema: string; palavras: string[] }[] = [
  {
    tema: "Tributação e Impostos",
    palavras: [
      "ipva", "imposto", "tributari", "itcd", "nota fiscal", "autoparcelamento",
      "licenciamento", "inscricao estadual", "efd", "comunicacao de venda",
    ],
  },
  { tema: "Defesa do Consumidor", palavras: ["procon"] },
  { tema: "Documentos e Identidade", palavras: ["cnh", "rg", "carteira de identidade", "carteira"] },
  { tema: "Proteção e Assistência Social", palavras: ["mulher", "defesa civil"] },
];

export function classificarTemaBusca(termo: string): string {
  const norm = normalizar(termo);
  return TEMAS.find(({ palavras }) => palavras.some((p) => norm.includes(p)))?.tema ?? "Outros assuntos";
}

export type TemaBusca = { tema: string; buscas: number; participacaoPct: number };

/** % sobre a soma da lista recebida — mesma base que `calcularInsightBusca`
 * usa quando não há total real (nunca mistura base truncada com total real
 * sem dizer qual é qual). */
export function agruparPorTema(termos: TermoBusca[]): TemaBusca[] {
  const somas = new Map<string, number>();
  for (const t of termos) {
    const tema = classificarTemaBusca(t.termo);
    somas.set(tema, (somas.get(tema) ?? 0) + t.buscas);
  }
  const total = termos.reduce((acc, t) => acc + t.buscas, 0);
  return [...somas.entries()]
    .map(([tema, buscas]) => ({ tema, buscas, participacaoPct: total > 0 ? (buscas / total) * 100 : 0 }))
    .sort((a, b) => b.buscas - a.buscas);
}

export type ResumoBusca = { oQueAconteceu: string; oQueSignifica: string; oportunidade: string };

/**
 * Narrativa de 3 partes: fato (número) → interpretação (o que o padrão
 * significa) → oportunidade (ação sugerida, sem julgar a navegação — a
 * demanda alta não prova que a navegação está ruim, só que existe interesse
 * concentrado; ver revisão do gestor de 2026-07).
 */
export function gerarResumoBusca(insight: InsightBusca, temas: TemaBusca[], rotuloPeriodo: string): ResumoBusca | null {
  if (temas.length === 0) return null;
  const base = insight.baseTotalReal ? "de todas as buscas" : "das buscas registradas";
  const oQueAconteceu = `O assunto mais procurado ${rotuloPeriodo} foi "${insight.termo}", responsável por ${Math.round(insight.participacaoPct)}% ${base}.`;

  const top = temas.slice(0, 3).filter((t) => t.tema !== "Outros assuntos");
  const somaTop = top.reduce((acc, t) => acc + t.participacaoPct, 0);
  const oQueSignifica =
    top.length >= 2
      ? `${top.map((t) => t.tema).join(", ")} concentraram ${Math.round(somaTop)}% do interesse — a procura dos cidadãos está concentrada em poucos assuntos, não espalhada.`
      : `A procura dos cidadãos concentrou-se em torno de ${top[0]?.tema.toLowerCase() ?? `"${insight.termo}"`}.`;

  const oportunidade =
    "Dar mais destaque a esses assuntos na página inicial — atalho, banner ou item de menu — pode reduzir o tempo até o cidadão encontrar o serviço que procura.";

  return { oQueAconteceu, oQueSignifica, oportunidade };
}
