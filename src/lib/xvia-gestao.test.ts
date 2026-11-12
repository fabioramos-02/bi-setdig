import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { prepararGestao, prepararOrgaoGestao, type EntradaGestao } from "./xvia-gestao.ts";
import { configurarFilaInicial, consultarEntregas, selecionarProblemas } from "./xvia-gestao-acoes.ts";
import { montarPorFeature, pbisDoEpico, arestas, situacoes } from "./cronograma.ts";
import { consumoPorOrgao, entregasDaSprint, execucaoXvia, filtrarItens, porModulo, sprintAtual, type Filtros } from "./tfs.ts";
import { linhasPrioridades } from "./xvia-prioridades.ts";
const ler = (n: string) => JSON.parse(fs.readFileSync(`datasets/tfs/v1/${n}.json`, "utf8"));
const base: EntradaGestao = { itens: ler("itens"), sprints: ler("sprints"), etp: ler("etp-ust"), contrato: ler("contrato"), financeiro: ler("financeiro"), hoje: "2026-11-11" };

test("gestão preserva execução, fila anterior, módulos e sprint em filtros individuais e combinados", () => {
  for (const p of [{}, { modulo: "CMS" }, { frente: "SGD" }, { frente: "Não identificado" }, { orgao: "SES" }, { sprint: "XVIA\\Sprint 6" }, { modulo: "CMS", frente: "X-VIA", orgao: "SES", sprint: "XVIA\\Sprint 6" }, { modulo: "VAZIO" }]) {
    const f: Filtros = { modulo: "", frente: "", orgao: "", sprint: "", ...p };
    const itens = filtrarItens(base.itens, f), g = prepararGestao({ ...base, itens });
    const e = execucaoXvia(itens, base.etp, base.contrato);
    assert.equal(g.execucao.execucao.ustExecutada, e.ustExecutada);
    assert.equal(g.execucao.execucao.valorExecutado, e.valorExecutado);
    assert.equal(g.execucao.orgaos.reduce((s, o) => s + o.ustExecutada, 0), consumoPorOrgao(itens, base.etp, base.contrato).reduce((s, o) => s + o.ustExecutada, 0));
    assert.deepEqual(g.modulos.map((m) => [m.epico, m.total, m.emProducao]).sort(), porModulo(itens).map((m) => [m.epico, m.total, m.emProducao]).sort());
    assert.deepEqual(g.sprint.itens.map((i) => i.id), entregasDaSprint(itens, sprintAtual(base.sprints)).itens.map((i) => i.id));
    for (const frente of ["X-VIA", "SGD"] as const) assert.deepEqual(g.acoes.filaAnterior[frente], linhasPrioridades(itens.filter((i) => i.frente === frente), base.sprints, base.hoje));
    const macro = montarPorFeature(itens, base.sprints, null, base.hoje);
    assert.deepEqual(g.macro.aFazer, macro.aFazer);
  }
});

test("grupos conservam estados do cronograma sem converter prazo vencido em atraso de desenvolvimento", () => {
  const g = prepararGestao(base), ps = pbisDoEpico(base.itens, null), s = situacoes(ps, base.sprints, arestas(ps), base.hoje);
  for (const [tipo, estado] of [["atraso", "atrasado"], ["replanejar", "nao_iniciado"], ["risco", "risco"], ["planejar", "sem_sprint"]] as const)
    assert.deepEqual(new Set(g.acoes.grupos[tipo].map((i) => i.id)), new Set(ps.filter((i) => s.get(i.id) === estado).map((i) => i.id)));
  assert.equal(new Set(g.acoes.problemas.map((p) => p.item.id)).size, g.acoes.problemas.length);
  assert.ok(g.acoes.problemas.every((p) => p.item.frente !== "Não identificado" && p.item.estado !== "Done" && p.item.estado !== "Removed"));
});

test("impacto usa apenas ligações cadastradas e sucessores ainda abertos; não inventa responsável", () => {
  const g = prepararGestao(base), ars = arestas(pbisDoEpico(base.itens, null));
  for (const p of g.acoes.problemas) {
    assert.equal(p.responsavel, p.item.responsavel ?? "Não informado");
    assert.equal(p.seguintes.length, ars.filter(([a, b]) => a === p.item.id && base.itens.some((i) => i.id === b && i.estado !== "Done" && i.estado !== "Removed")).length);
    assert.ok(p.seguintes.every((x) => ars.some(([a, b]) => a === p.item.id && b === x.id)));
    assert.doesNotMatch(p.tempo, /parad|aguardando/i);
  }
});

test("consulta por ação é explícita, mantém filtro de frente e não altera a coleção original", () => {
  const itens = [...base.itens], g = prepararGestao(base), selecionados = consultarEntregas(g.acoes, itens, "replanejar");
  assert.deepEqual(new Set(selecionados.map((i) => i.id)), g.acoes.ids.replanejar);
  assert.ok(selecionarProblemas(g.acoes, "SGD").every((p) => p.item.frente === "SGD"));
  assert.equal(selecionarProblemas(g.acoes, "Não identificado").length, 0);
  assert.equal(consultarEntregas(g.acoes, itens, "invalido"), itens);
  assert.deepEqual(itens, base.itens);
});

test("financeiro ausente permanece ausente; zero de execução não vira pagamento zero", () => {
  const g = prepararGestao({ ...base, itens: [], financeiro: null });
  assert.equal(g.execucao.temRegistros, false);
  assert.equal(g.execucao.cadeia.valorPago.valor, null);
  assert.equal(g.execucao.cadeia.ustAceita.valor, null);
  assert.equal(g.acoes.problemas.length, 0);
  assert.match(g.execucao.frase, /Não há tarefas/);
  assert.match(g.sprint.frase, /não tem entregas/);
});

test("grupos de espera e produção preservam as bases e o alvo abre sua página da fila", () => {
  const g = prepararGestao(base);
  assert.deepEqual(g.acoes.grupos.cobrar.filter((p) => p.frente === "X-VIA").map((p) => p.id).sort(), g.macro.aFazer.cobrar.map((p) => p.id).sort());
  assert.deepEqual(g.sprint.producaoProjeto, base.itens.filter((p) => (p.tipo === "Product Backlog Item" || p.tipo === "Bug") && p.coluna === "Em Produção"));
  const sgd = selecionarProblemas(g.acoes, "SGD"), alvo = sgd.at(-1)!;
  const inicio = configurarFilaInicial(g.acoes, alvo.item.id, "");
  assert.equal(inicio.frente, "SGD");
  assert.equal(inicio.todos, true);
  assert.ok(sgd.slice((inicio.pagina - 1) * 10, inicio.pagina * 10).some((p) => p.item.id === alvo.item.id));
});

test("documentos financeiros preenchidos conservam etapas independentes e vínculos por órgão", () => {
  const financeiro = { ...base.financeiro!,
    ordensServico: [{ numero: "OS-1", orgao: "SES", ustPrevista: 100, status: "ativa", fonte: "teste" }],
    medicoes: [{ id: "M-1", os: "OS-1", periodo: "2026-11", ustExecutada: 70, ustAceita: 50, status: "aceita", fonte: "teste" }],
    notasFiscais: [{ numero: "NF-1", medicoes: ["M-1"], valor: 500, status: "emitida", fonte: "teste" }],
    pagamentos: [{ notaFiscal: "NF-1", valor: 200, data: "2026-11-10", status: "pago", fonte: "teste" }], glosas: [],
  };
  const g = prepararGestao({ ...base, financeiro }), orgao = prepararOrgaoGestao(g.execucao, financeiro, "SES")!;
  assert.equal(g.execucao.temRegistros, true);
  assert.equal(g.execucao.cadeia.valorPago.valor, 200);
  assert.equal(g.execucao.cadeia.valorFaturado.valor, 500);
  assert.equal(g.execucao.cadeia.valorPendente.valor, 300);
  assert.equal(g.execucao.cadeia.ustAceita.valor, 50);
  assert.equal(orgao.documentos[0].medicoes[0].notas[0].pagamentos[0].valor, 200);
  assert.equal(g.execucao.execucao.ustExecutada, execucaoXvia(base.itens, base.etp, base.contrato).ustExecutada);
  const parcial = prepararGestao({ ...base, financeiro: { ...financeiro, notasFiscais: [], pagamentos: [] } });
  assert.equal(parcial.execucao.temRegistros, true);
  assert.equal(parcial.execucao.cadeia.valorPago.valor, null);
});

test("prazo da entrega não substitui situação do cronograma nem duração em coluna", () => {
  const item = { ...base.itens.find((p) => p.tipo === "Product Backlog Item")!, id: 9999999, estado: "Committed", coluna: "Em Desenvolvimento", frente: "X-VIA" as const, sprint: sprintAtual(base.sprints)!.sprint, prazo: "2026-01-01", pendencia: false, dependeDe: [], trava: [], diasSemAtualizar: null };
  const g = prepararGestao({ ...base, itens: [item] });
  const p = g.acoes.problemas[0];
  assert.equal(p.tipo, "prazo");
  assert.equal(p.situacao, "Em andamento");
  assert.equal(p.prazo, "2026-01-01");
  assert.equal(p.fimSprint, sprintAtual(base.sprints)!.fim);
  assert.equal(p.tempo, "Última atualização não informada");
});
