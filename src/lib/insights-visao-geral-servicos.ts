/** Insights macro-executivos pra Visão Geral de /servicos. Funções puras,
 *  testáveis. Consome dados já disponíveis (inventário estático + live) sem
 *  fetch novo — é resumo, não recálculo. */
import type { CartaRelacao } from "./data";

export type SituacaoGeral = {
  frase: string;
  notaSaude: string;
};

export function sintetizarSituacao(args: {
  servicosAtivos: number;
  totalAcessos: number | null;
  totalCliquesBotao: number;
  rotuloPeriodo: string;
}): SituacaoGeral {
  const { servicosAtivos, totalAcessos, totalCliquesBotao, rotuloPeriodo } = args;
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  const parteAcessos =
    totalAcessos !== null
      ? ` e recebeu ${fmt(totalAcessos)} acessos a páginas de serviço ${rotuloPeriodo}`
      : "";
  const parteCliques =
    totalCliquesBotao > 0
      ? ` O cidadão clicou ${fmt(totalCliquesBotao)} vezes em Acessar Serviço no período.`
      : "";

  return {
    frase: `O portal tem ${fmt(servicosAtivos)} serviços ativos${parteAcessos}.${parteCliques}`,
    notaSaude:
      "Comparação com períodos anteriores indisponível — o histórico por serviço só cobre o snapshot atual.",
  };
}

export type PontoAtencao = { chave: string; frase: string };

export function gerarPontosAtencao(args: {
  concentracaoOrgaoPct: number;
  orgaoSigla: string | null;
  destinoLiderPct: number;
  destinoLiderHost: string | null;
  categoriaLiderPct: number;
  cartasNovosMesAtual: number | null;
  cartasNovosMesAnterior: number | null;
}): PontoAtencao[] {
  const pontos: PontoAtencao[] = [];

  if (args.concentracaoOrgaoPct > 60 && args.orgaoSigla) {
    pontos.push({
      chave: "concentracao-oferta",
      frase: `${args.orgaoSigla} concentra ${args.concentracaoOrgaoPct.toFixed(0)}% dos serviços cadastrados — considere distribuir cadastros para outros órgãos.`,
    });
  }

  if (args.destinoLiderPct > 70 && args.destinoLiderHost) {
    pontos.push({
      chave: "dependencia-sistema",
      frase: `Dependência forte do sistema externo ${args.destinoLiderHost} — recebe ${args.destinoLiderPct.toFixed(0)}% dos cliques em Acessar Serviço. Falha nele impacta a maior parte do fluxo do portal.`,
    });
  }

  if (args.categoriaLiderPct > 50) {
    pontos.push({
      chave: "concentracao-categoria",
      frase: `Uma única categoria concentra ${args.categoriaLiderPct.toFixed(0)}% dos acessos — revisar navegação para melhorar descoberta de outros serviços.`,
    });
  }

  if (
    args.cartasNovosMesAtual !== null &&
    args.cartasNovosMesAnterior !== null &&
    args.cartasNovosMesAtual < 3 &&
    args.cartasNovosMesAnterior >= 3
  ) {
    pontos.push({
      chave: "cadastro-desacelerou",
      frase: `Cadência de cadastro caiu — apenas ${args.cartasNovosMesAtual} novos serviços no último mês (${args.cartasNovosMesAnterior} no mês anterior). Verificar bloqueios com órgãos.`,
    });
  }

  return pontos.slice(0, 4);
}

/** Conta cartas com createdAt dentro do mês YYYY-MM. Retorna null se nenhum
 *  createdAt disponível (dataset antigo, sem SQL estendida). */
export function contarCartasNovosNoMes(cartas: CartaRelacao[], mesRef: string): number | null {
  const comData = cartas.filter((c) => c.createdAt);
  if (comData.length === 0) return null;
  return comData.filter((c) => c.createdAt!.slice(0, 7) === mesRef).length;
}

/** Retorna YYYY-MM do mês atual e do mês anterior a partir de uma data
 *  ISO (YYYY-MM-DD). Útil pra comparar cadência de cadastro. */
export function mesAtualEAnterior(dataRef: string): { atual: string; anterior: string } {
  const [ano, mes] = dataRef.slice(0, 7).split("-").map(Number);
  const atual = `${ano}-${String(mes).padStart(2, "0")}`;
  const mesAnt = mes === 1 ? 12 : mes - 1;
  const anoAnt = mes === 1 ? ano - 1 : ano;
  const anterior = `${anoAnt}-${String(mesAnt).padStart(2, "0")}`;
  return { atual, anterior };
}
