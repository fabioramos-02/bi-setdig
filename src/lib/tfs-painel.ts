/**
 * Quadro do time X-VIA — espelho do dashboard do time no TFS. O pipeline roda
 * a consulta salva por trás de cada card/gráfico (data-platform/run.py,
 * run_tfs; dataset tfs/painel-time), então card novo lá aparece aqui sem
 * mudar código. Aqui só organiza para leitura de gestão: o que pede ação, o
 * que está em andamento/fora da fila e o tamanho do trabalho.
 */

export type WidgetPainel = {
  titulo: string; // nome do card no dashboard, como está lá
  tipo: "numero" | "grafico";
  total: number;
  grupos?: { rotulo: string; qtd: number }[];
};

export type CardPainel = { rotulo: string; total: number };
export type GraficoPainel = { pergunta: string; total: number; grupos: { rotulo: string; qtd: number }[] };

export type QuadroTime = {
  acao: CardPainel[]; // impedido, aguardando decisão, bug
  andamento: CardPainel[]; // em desenvolvimento, despriorizado, descontinuado
  tamanho: CardPainel[]; // contagem por tipo (épico, PBI, tarefa…)
  graficos: GraficoPainel[];
  anchor: string | null;
};

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ponytail: grupo pelo nome do card. Card com nome novo cai em "tamanho do
// trabalho" — aparece, só não ganha destaque; aí acrescentar a palavra aqui.
const ACAO = /impedid|aguar|bug/; // "aguar": o dashboard às vezes encurta ("AGUAR... DECISÃO")
const ANDAMENTO = /desenvolv|despriorizad|descontinuad/;

/** Nome em caixa alta do dashboard -> rótulo legível. Sigla curta fica. */
const ROTULOS: [RegExp, string][] = [
  [/^pbi$/, "Itens do backlog (PBI)"],
  [/^task$/, "Tarefas"],
  [/^epic$/, "Épicos"],
  [/^feature$/, "Funcionalidades"],
  [/^bugs?$/, "Bugs"],
  [/aguar.*decis/, "Aguardando decisão"],
  [/^impedid/, "Impedidos"],
  [/^despriorizad/, "Despriorizados"],
  [/^descontinuad/, "Descontinuados"],
  [/em desenvolv/, "Em desenvolvimento"],
];
const PERGUNTAS: [RegExp, string][] = [
  [/sem ust/, "Quais sprints têm mais tarefas sem UST lançada?"],
  [/pacotes? de entrega/, "Em que etapa estão os pacotes de entrega?"],
];

function capitalizar(s: string): string {
  const t = s.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function rotuloCard(titulo: string): string {
  const n = normalizar(titulo).trim();
  return ROTULOS.find(([re]) => re.test(n))?.[1] ?? capitalizar(titulo);
}

export function perguntaGrafico(titulo: string): string {
  const n = normalizar(titulo);
  return PERGUNTAS.find(([re]) => re.test(n))?.[1] ?? capitalizar(titulo);
}

export function lerQuadroTime(widgets: WidgetPainel[]): QuadroTime {
  const cards = widgets.filter((w) => w.tipo === "numero").map((w) => ({ titulo: normalizar(w.titulo), rotulo: rotuloCard(w.titulo), total: w.total }));
  const acao = cards.filter((c) => ACAO.test(c.titulo));
  const andamento = cards.filter((c) => !ACAO.test(c.titulo) && ANDAMENTO.test(c.titulo));
  const tamanho = cards.filter((c) => !ACAO.test(c.titulo) && !ANDAMENTO.test(c.titulo));
  const semTitulo = ({ rotulo, total }: { rotulo: string; total: number }) => ({ rotulo, total });

  const soma = acao.reduce((s, c) => s + c.total, 0);
  const anchor = acao.length
    ? `${soma.toLocaleString("pt-BR")} ${soma === 1 ? "item pede" : "itens pedem"} ação do time agora: ${acao.map((c) => `${c.total.toLocaleString("pt-BR")} ${c.rotulo.toLowerCase()}`).join(", ")}.`
    : null;

  return {
    acao: acao.map(semTitulo),
    andamento: andamento.map(semTitulo),
    tamanho: tamanho.map(semTitulo),
    graficos: widgets.filter((w) => w.tipo === "grafico").map((w) => ({ pergunta: perguntaGrafico(w.titulo), total: w.total, grupos: w.grupos ?? [] })),
    anchor,
  };
}

/** Dias inteiros entre a extração e `agora` — base do aviso de desatualizado. */
export function diasDesde(isoExtracao: string, agora: Date): number {
  return Math.floor((agora.getTime() - new Date(isoExtracao).getTime()) / 86_400_000);
}
