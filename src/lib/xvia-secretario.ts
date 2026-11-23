/** As 5 perguntas do Secretário Executivo (Robson), uma resposta curta cada.
 * Fonte das perguntas: vault 20-projeto/dashboard-analytics-setdig/2026-11-10-painel-executivo-xvia.md e PBI #1368710.
 * Só formata o que prepararResumoXvia já calculou: nenhuma conta nova aqui.
 * O mesmo objeto sai em /projeto-xvia/secretario.json, que o painel.py copia para o dashboard do TFS. */
import { fmtNum, fmtReais, tomDecisoes, tomEntregas, tomExecucao, type Tom } from "./tfs.ts";
import { quemNoRegistro, type prepararResumoXvia } from "./xvia-resumo.ts";
import { destinoDaAba, type DestinoProjeto } from "./xvia-navegacao.ts";

export type RespostaSecretario = {
  n: number;
  pergunta: string;
  palavra: string; // a cor nunca fala sozinha
  tom: Tom;
  resposta: string; // uma frase
  destino: DestinoProjeto;
};

const plural = (n: number, um: string, varios: string) => `${fmtNum(n)} ${n === 1 ? um : varios}`;
const PALAVRA: Record<Tom, string> = { ok: "No ritmo", atencao: "Atenção", critico: "Abaixo", info: "Sem comparação", neutro: "Não informado" };

export function respostasSecretario(r: ReturnType<typeof prepararResumoXvia>): RespostaSecretario[] {
  const { prazo, andamento: a, consumo: c, atraso, paradas, decisoes } = r;
  const impedidos = paradas.filter((i) => i.coluna === "Impedido");
  const tPrazo: Tom = r.temEntregas ? tomEntregas(a.pct, prazo.pctDecorrido) : "neutro";
  const tUst: Tom = r.temTarefas ? tomExecucao(c.ustExecutada, c.previstoAteMes) : "neutro";
  const pctUst = c.previstoAteMes ? Math.round((c.ustExecutada / c.previstoAteMes) * 100) : null;
  const tAtraso: Tom = !r.temEntregas ? "neutro" : atraso.length ? "atencao" : "ok";
  const tTrava: Tom = !r.temEntregas ? "neutro" : tomDecisoes(paradas);
  const quem = quemNoRegistro(paradas);
  const porModulo = new Map<string, number>();
  for (const i of a.origem.itens ?? []) porModulo.set(i.epico || "Sem módulo", (porModulo.get(i.epico || "Sem módulo") ?? 0) + 1);
  const topModulos = [...porModulo].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([m, n]) => `${m} ${fmtNum(n)}`).join(", ");

  return [
    { n: 1, pergunta: "Estamos no prazo?", tom: tPrazo, palavra: PALAVRA[tPrazo],
      resposta: `${a.pct}% das entregas em produção com ${prazo.pctDecorrido}% do prazo · faltam ${plural(prazo.diasRestantes, "dia", "dias")}`,
      destino: { nivel: "gerente", aba: "cronograma" } },
    { n: 2, pergunta: "Quanto do contrato já foi usado?", tom: tUst, palavra: PALAVRA[tUst],
      resposta: `${fmtNum(c.ustExecutada)} UST${c.valorExecutado !== null ? ` = ${fmtReais(c.valorExecutado)}` : ""}${pctUst !== null ? ` · ${pctUst}% do previsto até o mês ${prazo.mesDoContrato}` : ""}`,
      destino: destinoDaAba("ust") },
    { n: 3, pergunta: "O que foi entregue e o que atrasou?", tom: tAtraso, palavra: PALAVRA[tAtraso],
      resposta: `${plural(a.emProducao, "entrega em produção", "entregas em produção")} · ${plural(atraso.length, "atrasada", "atrasadas")} · ${fmtNum(a.planejadas - a.emProducao)} a entregar`,
      destino: { nivel: "gerente", aba: "cronograma" } },
    { n: 4, pergunta: "O que trava e quem resolve?", tom: tTrava, palavra: PALAVRA[tTrava],
      resposta: paradas.length
        ? `${plural(decisoes.length, "aguarda decisão", "aguardam decisão")} · ${plural(impedidos.length, "impedida", "impedidas")} · ${quem ? `no registro: ${quem}` : "sem responsável no registro"}`
        : "Nada parado",
      destino: { nivel: "gerente", aba: "prioridades", alvo: "decisoes-pendentes" } },
    { n: 5, pergunta: "O que está em produção para os órgãos?", tom: "neutro", palavra: "Resultado não medido",
      resposta: a.emProducao ? `Por módulo: ${topModulos}. O resultado para os órgãos ainda não é medido.` : "Nada em produção. O resultado para os órgãos ainda não é medido.",
      destino: { nivel: "gerente", aba: "modulos" } },
  ];
}
