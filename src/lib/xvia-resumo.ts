/** Preparação da apresentação. As contas e classificações continuam nos módulos existentes. */
import { montarCronograma, montarPorFeature } from "./cronograma.ts";
import { enriquecerVeredito } from "./tfs-origem.ts";
import {
  andamentoEntregas, atrasadas, cadeiaFinanceira, consumoContrato, ehEntrega, entregasDoMes,
  execucaoMensal, fmtData, fmtNum, ORDEM_TOM, pendencias, prazoProjeto, soXvia, vereditoExecutivo,
  type EtpUst, type Financeiro, type Sinal, type TfsContrato, type TfsItem, type TfsSprint,
} from "./tfs.ts";
import type { DestinoProjeto } from "./xvia-navegacao.ts";

export type EntradaResumoXvia = {
  itens: TfsItem[]; sprints: TfsSprint[]; contrato: TfsContrato | null; etp: EtpUst | null;
  financeiro: Financeiro | null; hoje: string; recorte: boolean;
};
const nomeMes = (mes: string) => new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
function mesAnterior(mes: string) {
  const d = new Date(`${mes}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/** "[CGE] - Transparência" → "CGE · Transparência": dá ao título cru do item o órgão e o assunto. */
export function contextoItem(i: Pick<TfsItem, "feature" | "responsavel">): string {
  const assunto = i.feature?.replace(/^\[([^\]]+)\]\s*-?\s*/, "$1 · ").trim();
  const dono = i.responsavel ? `responsável no registro: ${i.responsavel}` : "sem responsável no registro";
  return assunto ? `${assunto} · ${dono}` : dono;
}

/** Quem aparece como responsável nos registros: "Maycon Lisboa (10) e Fabio Ramos (2)". Nome curto = primeiro e último. */
export function quemNoRegistro(itens: Pick<TfsItem, "responsavel">[]): string | null {
  const conta = new Map<string, number>();
  for (const i of itens) if (i.responsavel) {
    const p = i.responsavel.split(" ");
    const nome = p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
    conta.set(nome, (conta.get(nome) ?? 0) + 1);
  }
  const top = [...conta].sort((a, b) => b[1] - a[1]);
  if (!top.length) return null;
  const nomes = top.slice(0, 2).map(([n, q]) => `${n} (${fmtNum(q)})`);
  const resto = top.length - 2;
  return resto > 0 ? `${nomes.join(", ")} e mais ${fmtNum(resto)}` : nomes.join(" e ");
}

function sinalSemBase(s: Sinal, tipo: "entregas" | "tarefas"): Sinal {
  const texto = `Sem ${tipo} da X-VIA neste filtro`;
  return { ...s, tom: "neutro", palavra: "sem base para avaliar", principal: texto, resumo: `${texto}.`,
    comparacao: "Mude os filtros para consultar a execução da contratada.", barras: undefined,
    acao: s.id === "execucao" ? { texto: "Ver execução contratual", aba: "ust" } : s.id === "decisoes" ? { texto: "Ver prioridades", aba: "prioridades" } : s.acao,
    origem: { rotulo: texto, numero: texto, detalhe: "Os itens da SGD e os sem frente identificada ficam fora dos indicadores da X-VIA.", itens: [] } };
}

export function prepararResumoXvia({ itens, sprints, contrato, etp, financeiro, hoje, recorte }: EntradaResumoXvia) {
  const xv = soXvia(itens);
  const prazo = prazoProjeto(contrato, sprints, hoje);
  const consumo = consumoContrato(itens, etp, contrato, prazo.mesDoContrato);
  const andamento = andamentoEntregas(xv);
  const atraso = atrasadas(xv, sprints, hoje);
  const paradas = pendencias(xv);
  const decisoes = paradas.filter((i) => i.coluna === "Aguardando decisão");
  const crono = montarCronograma(xv, sprints, null, hoje);
  const aFazer = montarPorFeature(itens, sprints, null, hoje).aFazer;
  const cadeia = cadeiaFinanceira(financeiro, { ust: consumo.ustExecutada, valor: consumo.valorExecutado });
  const features = xv.filter((i) => i.tipo === "Feature" && i.estado !== "Removed")
    .map((f) => xv.filter((p) => ehEntrega(p) && p.estado !== "Removed" && p.featureId === f.id)).filter((ps) => ps.length);
  const mes = hoje.slice(0, 7), anterior = mesAnterior(mes);
  const temEntregas = andamento.planejadas > 0;
  const temTarefas = consumo.tarefas > 0;
  const v = enriquecerVeredito(
    vereditoExecutivo({ prazo, andamento, consumo, paradas, atrasadas: atraso, recorte, semPagamento: cadeia.valorPago.valor === null }),
    { itens: xv, prazo, andamento, consumo, paradas, atrasadas: atraso, valorUst: contrato?.valorUst ?? null, recorte },
  );
  const sinais = v.sinais.map((s): Sinal => {
    if ((s.id === "entregas" || s.id === "decisoes") && !temEntregas) return sinalSemBase(s, "entregas");
    if (s.id === "execucao" && !temTarefas) return sinalSemBase(s, "tarefas");
    return { ...s,
      resumo: s.resumo.replaceAll("neste recorte", "nos filtros aplicados"),
      principal: s.id === "decisoes" ? `${fmtNum(decisoes.length)} ${decisoes.length === 1 ? "aguarda" : "aguardam"} decisão` : s.principal.replace("neste recorte", "nos filtros aplicados"),
      palavra: s.id === "decisoes" && s.tom === "critico" ? "sem atualização há mais de 30 dias" : s.palavra.replace(/recorte/i, "filtros aplicados"),
      comparacao: s.id === "decisoes" ? `${fmtNum(paradas.length)} entregas paradas · ${fmtNum(atraso.length)} passaram da sprint ou do prazo` : s.comparacao.replace("recorte filtrado", "filtros aplicados").replace("no TR", "no contrato"),
      acao: s.id === "execucao" ? { texto: "Ver execução contratual", aba: "ust" } : s.id === "decisoes" ? { texto: "Ver prioridades", aba: "prioridades" } : s.acao,
    };
  }).sort((a, b) => ORDEM_TOM.indexOf(a.tom) - ORDEM_TOM.indexOf(b.tom)); // mais grave primeiro, inclusive no celular
  const frase = !temEntregas && !temTarefas
    ? itens.length ? "Este filtro não contém entregas ou tarefas da X-VIA para avaliar o contrato." : "Nenhum item corresponde aos filtros aplicados."
    : !temEntregas ? `Há tarefas da X-VIA neste filtro, mas não há entregas para avaliar o avanço. Execução registrada: ${fmtNum(consumo.ustExecutada)} UST.`
    : v.frase.replace(" Nenhum pagamento registrado ainda.", "").replaceAll("neste recorte", "nos filtros aplicados");
  // Quem: só o que o registro diz. Sem responsável registrado, a tela diz isso em vez de supor.
  const passos: { texto: string; quem: string | null; destino: DestinoProjeto }[] = [];
  if (decisoes.length) passos.push({ texto: `Revisar ${fmtNum(decisoes.length)} ${decisoes.length === 1 ? "decisão pendente" : "decisões pendentes"}`, quem: quemNoRegistro(decisoes), destino: { nivel: "gerente", aba: "prioridades", alvo: "decisoes-pendentes" } });
  if (aFazer.replanejar.length) passos.push({ texto: `Replanejar ${fmtNum(aFazer.replanejar.length)} entregas que não começaram`, quem: quemNoRegistro(aFazer.replanejar), destino: { nivel: "gerente", aba: "cronograma" } });
  if (cadeia.valorPago.valor === null) passos.push({ texto: "Atualizar os registros financeiros", quem: null, destino: { nivel: "detalhe", aba: "registros" } });
  if (paradas.length && !decisoes.length) passos.push({ texto: "Revisar os impedimentos registrados", quem: quemNoRegistro(paradas), destino: { nivel: "gerente", aba: "prioridades" } });
  if (!contrato?.ans?.medicao) passos.push({ texto: "Solicitar a medição dos prazos de atendimento", quem: null, destino: { nivel: "gerente", aba: "fiscalizacao", alvo: "prazos-atendimento" } });
  return {
    xv, prazo, consumo, andamento, atraso, paradas, decisoes, crono, cadeia, features,
    featuresProntas: features.filter((ps) => ps.every((p) => p.estado === "Done")).length,
    pendSgd: pendencias(itens.filter((i) => i.frente === "SGD")),
    mes, anterior, nomeMes: nomeMes(mes), nomeMesAnterior: nomeMes(anterior),
    entregasMes: entregasDoMes(xv, mes).flatMap((g) => g.itens),
    entregasAnt: entregasDoMes(xv, anterior).flatMap((g) => g.itens),
    mensal: execucaoMensal(itens, etp, contrato, hoje), vigencia: contrato?.vigenciaMeses ?? 18,
    cabecalho: `${contrato?.contrato ? `${contrato.contrato} · ` : ""}${nomeMes(mes)} · mês ${prazo.mesDoContrato} de ${contrato?.vigenciaMeses ?? 18} · atualizado em ${fmtData(hoje)}`,
    veredito: { frase, sinais, tom: !temEntregas && !temTarefas ? "neutro" as const : v.tom },
    temEntregas, temTarefas, atencao: decisoes.slice(0, 3).map((i) => ({ id: i.id, titulo: i.titulo, contexto: contextoItem(i) })), passos: passos.slice(0, 3),
    proximosRelatorio: [...atraso, ...paradas.filter((d) => !atraso.includes(d))].slice(0, 8),
  };
}
