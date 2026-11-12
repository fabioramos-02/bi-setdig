/** Sínteses de gestão preparadas sobre as regras existentes. */
import { montarCronograma, montarPorFeature, ROTULO_SITUACAO } from "./cronograma.ts";
import { cadeiaFinanceira, consumoPorOrgao, entregasDaSprint, entregasDoMes, execucaoXvia, fmtData, fmtNum, fmtReais, porModulo, SEM_ORGAO, sprintAtual, type EtpUst, type Financeiro, type TfsContrato, type TfsItem, type TfsSprint } from "./tfs.ts";
import { ACAO_GESTAO, prepararAcoesGerente, type AcoesGerente } from "./xvia-gestao-acoes.ts";

export type EntradaGestao = { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string; etp: EtpUst | null; contrato: TfsContrato | null; financeiro: Financeiro | null };

export function prepararModulosGestao(itens: TfsItem[], macro: ReturnType<typeof montarPorFeature>, acoes: AcoesGerente, hoje: string) {
  const ordem = Object.keys(ACAO_GESTAO);
  return porModulo(itens).map((m) => {
    const linha = macro.linhas.find((l) => l.titulo === m.epico);
    const problemas = acoes.problemas.filter((p) => (p.item.epico ?? "Sem épico") === m.epico);
    const foco = problemas[0];
    const proximaSprint = macro.colunas.find((s) => s.inicio > hoje && linha?.pbis.some((p) => p.sprint === s.sprint && p.estado !== "Done")) ?? null;
    const motivos = (["decisao", "impedimento", "atraso", "orgao", "risco", "replanejar", "planejar"] as const).map((k) => ({
      tipo: k, rotulo: ACAO_GESTAO[k].rotulo, itens: acoes.grupos[k].filter((p) => (p.epico ?? "Sem épico") === m.epico),
    })).filter((g) => g.itens.length);
    return {
      ...m, id: linha?.id ?? null, problemas, motivos, foco,
      atrasadas: acoes.grupos.prazo.filter((p) => (p.epico ?? "Sem épico") === m.epico).length,
      dependencias: itens.filter((p) => (p.epico ?? "Sem épico") === m.epico && (p.dependeDe?.length ?? 0) > 0).length,
      cronograma: linha ?? null, proximaSprint,
      proximas: proximaSprint ? linha!.pbis.filter((p) => p.sprint === proximaSprint.sprint && p.estado !== "Done").length : 0,
      situacao: linha && linha.situacao !== "vazio" ? ROTULO_SITUACAO[linha.situacao] : "Sem entregas no cronograma",
      acao: foco?.acao ?? (linha?.situacao === "concluido" ? "Acompanhar os próximos compromissos e confirmar os registros de entrega." : "Conferir se há trabalho a detalhar e planejar."),
      inversoes: acoes.paresInvertidos.filter((p) => p.antes.epico === m.epico || p.depois.epico === m.epico).length,
      ordem: foco ? ordem.indexOf(foco.tipo) : ordem.length,
    };
  }).sort((a, b) => a.ordem - b.ordem || b.problemas.length - a.problemas.length || a.epico.localeCompare(b.epico, "pt-BR"));
}
export type ModuloGestao = ReturnType<typeof prepararModulosGestao>[number];

export function prepararSprintGestao(itens: TfsItem[], sprints: TfsSprint[], hoje: string, acoes: AcoesGerente) {
  const atual = sprintAtual(sprints);
  const dados = entregasDaSprint(itens, atual);
  const abertas = dados.itens.filter((p) => p.estado !== "Done");
  const fila = abertas.filter((p) => ["A fazer", "Área de Negócios"].includes(p.coluna ?? ""));
  const andamento = abertas.filter((p) => ["Em Desenvolvimento", "Em Homologação"].includes(p.coluna ?? ""));
  const esperando = abertas.filter((p) => ["Aguardando decisão", "Impedido", "Aguardando Validação do Órgão"].includes(p.coluna ?? ""));
  const classificadas = new Set([...fila, ...andamento, ...esperando].map((p) => p.id));
  const producao = dados.itens.filter((p) => p.coluna === "Em Produção");
  const concluidas = dados.itens.filter((p) => p.estado === "Done");
  const risco = dados.itens.filter((p) => acoes.situacao.get(p.id) === "risco");
  const proxima = [...sprints].sort((a, b) => a.inicio.localeCompare(b.inicio)).find((s) => s.inicio > hoje) ?? null;
  const proximas = proxima ? entregasDaSprint(itens, proxima).itens : [];
  const frase = !atual ? "A sprint atual não está identificada nos dados." : !dados.itens.length ? `${atual.nome} não tem entregas nos filtros aplicados.`
    : `${atual.nome}: ${fmtNum(producao.length)} de ${fmtNum(dados.itens.length)} entregas em produção; ${fmtNum(abertas.length)} permanecem abertas no retrato de ${fmtData(hoje)}.`;
  const peso = (p: TfsItem) => esperando.includes(p) ? 0 : fila.includes(p) ? 1 : p.estado !== "Done" ? 2 : 3;
  const consulta = [...dados.itens].sort((a, b) => peso(a) - peso(b) || (b.diasSemAtualizar ?? -1) - (a.diasSemAtualizar ?? -1) || a.id - b.id);
  const historico = entregasDoMes(itens, hoje.slice(0, 7));
  const mesLabel = new Date(`${hoje.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return { atual, ...dados, abertas, fila, andamento, esperando, producao, concluidas, risco, consulta, outras: abertas.filter((p) => !classificadas.has(p.id)), proxima, proximas, frase, historico, mesLabel, totalMes: historico.reduce((s, g) => s + g.itens.length, 0), producaoProjeto: itens.filter((p) => (p.tipo === "Product Backlog Item" || p.tipo === "Bug") && p.coluna === "Em Produção") };
}
export type SprintGestao = ReturnType<typeof prepararSprintGestao>;
export const filtrarSprint = (s: SprintGestao, coluna: string) => coluna ? s.consulta.filter((p) => (p.coluna ?? "Sem coluna") === coluna) : s.consulta;

export function prepararExecucaoGestao(itens: TfsItem[], etp: EtpUst | null, contrato: TfsContrato | null, financeiro: Financeiro | null) {
  const execucao = execucaoXvia(itens, etp, contrato);
  const cadeia = cadeiaFinanceira(financeiro, { ust: execucao.ustExecutada, valor: execucao.valorExecutado });
  const orgaos = consumoPorOrgao(itens, etp, contrato).map((o) => ({ ...o, pct: execucao.ustExecutada ? Math.round(o.ustExecutada / execucao.ustExecutada * 1000) / 10 : null }));
  const semOrgao = orgaos.find((o) => o.orgao === SEM_ORGAO);
  const maior = orgaos.find((o) => o.orgao !== SEM_ORGAO && o.ustExecutada > 0);
  const temRegistros = !!financeiro && [financeiro.ordensServico, financeiro.medicoes, financeiro.notasFiscais, financeiro.pagamentos, financeiro.glosas].some((lista) => lista.length > 0);
  const frase = !execucao.tarefas ? "Não há tarefas do contrato da X-VIA nos filtros aplicados." : `A X-VIA executou ${fmtNum(execucao.ustExecutada)} UST${execucao.valorExecutado !== null ? `, equivalentes a ${fmtReais(execucao.valorExecutado)} em valor calculado` : ""}. Esse valor não é faturamento nem pagamento.`;
  const concentracao = maior ? `${maior.orgao} concentra ${fmtNum(maior.ustExecutada)} de ${fmtNum(execucao.ustExecutada)} UST (${fmtNum(maior.pct ?? 0)}% do total executado), maior consumo entre os órgãos identificados.` : "Ainda não há execução atribuída a um órgão identificado nos filtros aplicados.";
  return { execucao, cadeia, orgaos, semOrgao, maior, temRegistros, frase, concentracao };
}
export type ExecucaoGestao = ReturnType<typeof prepararExecucaoGestao>;
export function prepararOrgaoGestao(dados: ExecucaoGestao, financeiro: Financeiro | null, nome: string | null) {
  const orgao = dados.orgaos.find((o) => o.orgao === nome);
  if (!orgao) return null;
  const cadeia = cadeiaFinanceira(financeiro, { ust: orgao.ustExecutada, valor: orgao.valorConsumido }, orgao.orgao === SEM_ORGAO ? "__sem__" : orgao.orgao);
  const documentos = cadeia.recorte.os.map((os) => ({ ...os, medicoes: cadeia.recorte.medicoes.filter((m) => m.os === os.numero).map((medicao) => ({ ...medicao, notas: cadeia.recorte.notas.filter((n) => n.medicoes.includes(medicao.id)).map((nota) => ({ ...nota, pagamentos: cadeia.recorte.pagamentos.filter((p) => p.notaFiscal === nota.numero) })) })) }));
  return { ...orgao, cadeia, documentos };
}

export function prepararGestao(a: EntradaGestao) {
  const acoes = prepararAcoesGerente(a.itens, a.sprints, a.hoje);
  const macro = montarPorFeature(a.itens, a.sprints, null, a.hoje);
  return { acoes, macro, modulos: prepararModulosGestao(a.itens, macro, acoes, a.hoje), sprint: prepararSprintGestao(a.itens, a.sprints, a.hoje, acoes), execucao: prepararExecucaoGestao(a.itens, a.etp, a.contrato, a.financeiro) };
}
export type GestaoProjeto = ReturnType<typeof prepararGestao>;

export function prepararCronogramaGestao(itens: TfsItem[], sprints: TfsSprint[], hoje: string, modulo: string, feature: number | null) {
  const epicos = [...new Map(itens.filter((p) => p.epicoId && p.epico).map((p) => [p.epicoId!, p.epico!])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const epicoId = epicos.find(([, nome]) => nome === modulo)?.[0] ?? null;
  const m = montarPorFeature(itens, sprints, epicoId, hoje);
  const linhaSel = m.linhas.find((l) => l.id === feature) ?? null;
  const detalhe = epicoId !== null && linhaSel ? montarCronograma(itens, sprints, epicoId, hoje, linhaSel.id) : null;
  const temXvia = itens.some((p) => p.tipo === "Product Backlog Item" && p.frente === "X-VIA" && p.estado !== "Removed");
  return { epicos, epicoId, nomeModulo: modulo, m, linhaSel, detalhe, titulo: epicoId === null ? "Cronograma por módulo" : `Cronograma: ${modulo}`, frase: temXvia ? m.frase : "Não há histórias da X-VIA para avaliar neste filtro. O gráfico mostra as histórias das frentes presentes nos dados." };
}
