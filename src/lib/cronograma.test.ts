import { test } from "node:test";
import assert from "node:assert/strict";
import { arestas, cadeias, invertidas, montarCronograma, montarPorFeature, situacoes } from "./cronograma.ts";
import type { TfsItem, TfsSprint } from "./tfs.ts";

const pbi = (id: number, sprint: string, over: Partial<TfsItem> = {}): TfsItem => ({
  id, tipo: "Product Backlog Item", titulo: `PBI ${id}`, estado: "Committed", coluna: "Em Desenvolvimento",
  area: "XVIA", frente: "X-VIA", sprint, epicoId: 1, epico: "CMS", featureId: 2, feature: "f", pbiId: null,
  orgao: null, tags: [], tipoEntrega: null, pendencia: false, criadoEm: null, alteradoEm: null, fechadoEm: null,
  prazo: null, diasSemAtualizar: null, atividadeUst: null, complexidadeUst: null, ust: null, dataExecucao: null,
  codigoCatalogo: null, dependeDe: [], trava: [], ...over,
});
const sprints: TfsSprint[] = [
  { sprint: "XVIA\\Sprint 4", nome: "Sprint 4", inicio: "2026-10-01", fim: "2026-10-14", situacao: "encerrada" },
  { sprint: "XVIA\\Sprint 5", nome: "Sprint 5", inicio: "2026-10-15", fim: "2026-10-28", situacao: "encerrada" },
  { sprint: "XVIA\\Sprint 6", nome: "Sprint 6", inicio: "2026-10-29", fim: "2026-11-11", situacao: "atual" },
  { sprint: "XVIA\\Sprint 7", nome: "Sprint 7", inicio: "2026-11-12", fim: "2026-11-25", situacao: "futura" },
];
const HOJE = "2026-11-05";

test("arestas: dependeDe e trava viram a mesma ligação, só dentro do recorte", () => {
  const ps = [pbi(1, "XVIA\\Sprint 6", { trava: [2] }), pbi(2, "XVIA\\Sprint 7", { dependeDe: [1, 99] })];
  assert.deepEqual(arestas(ps), [[1, 2]]);
  assert.deepEqual(cadeias([1, 2, 3], [[1, 2]]), { grupos: [[1, 2]], soltos: [3] });
});

test("situacoes: atrasado pela sprint; sucessor de atrasado fica em risco", () => {
  const ps = [pbi(1, "XVIA\\Sprint 5"), pbi(2, "XVIA\\Sprint 7", { dependeDe: [1] }), pbi(3, "XVIA\\Sprint 4", { estado: "Done" })];
  const s = situacoes(ps, sprints, arestas(ps), HOJE);
  assert.deepEqual([s.get(1), s.get(2), s.get(3)], ["atrasado", "risco", "concluido"]);
});

test("situacoes com motivo: esperando pela coluna; sprint vencida sem começar = não iniciado; invertida acusada", () => {
  const ps = [
    pbi(1, "XVIA\\Sprint 5", { coluna: "A fazer" }),
    pbi(2, "XVIA\\Sprint 5", { coluna: "Área de Negócios" }),
    pbi(3, "XVIA\\Sprint 4", { coluna: "Aguardando Validação do Órgão" }),
    pbi(4, "XVIA\\Sprint 7", { coluna: "Impedido" }),
    pbi(5, "XVIA\\Sprint 7", { coluna: "A fazer", dependeDe: [1] }), // depende de não iniciado: risco
    pbi(6, "XVIA\\Sprint 6", { coluna: "A fazer", dependeDe: [7] }),
    pbi(7, "XVIA\\Sprint 7", { coluna: "A fazer" }), // predecessora DEPOIS da sucessora
  ];
  const ars = arestas(ps);
  const s = situacoes(ps, sprints, ars, HOJE);
  assert.deepEqual([1, 2, 3, 4, 5].map((i) => s.get(i)), ["nao_iniciado", "nao_iniciado", "esperando", "esperando", "risco"]);
  assert.deepEqual(invertidas(ps, sprints, ars), [[7, 6]]);
});

test("montarPorFeature: uma linha por Feature com prontos/total, intervalo de sprints e a pior situação; alertas do TFS", () => {
  const feat = (id: number, titulo: string, over: Partial<TfsItem> = {}) => pbi(id, "XVIA", { tipo: "Feature", titulo, featureId: id, ...over });
  const itens = [
    feat(10, "CMS Cartas"), feat(20, "Notícias", { estado: "Done" }), feat(30, "Vazia"),
    pbi(1, "XVIA\\Sprint 4", { featureId: 10, estado: "Done", coluna: "Em Produção", trava: [3] }),
    pbi(2, "XVIA\\Sprint 5", { featureId: 10, coluna: "Aguardando Validação do Órgão" }),
    pbi(3, "XVIA\\Sprint 6", { featureId: 20, coluna: "A fazer" }), // Feature Done com PBI aberto
  ];
  const r = montarPorFeature(itens, sprints, 1, HOJE);
  const l = new Map(r.linhas.map((x) => [x.titulo, x]));
  assert.deepEqual([l.get("CMS Cartas")?.prontos, l.get("CMS Cartas")?.total, l.get("CMS Cartas")?.situacao], [1, 2, "esperando"]);
  assert.deepEqual([l.get("CMS Cartas")?.ini, l.get("CMS Cartas")?.fim], [0, 1]); // Sprint 4..5, colunas a partir da Sprint 4
  assert.equal(l.get("Vazia")?.situacao, "vazio");
  assert.deepEqual(r.ligacoes.map((x) => [x.de, x.para, x.invertida]), [[10, 20, false]]);
  assert.deepEqual([r.aFazer.cobrar.length, r.aFazer.replanejar.length], [1, 0]);
  assert.deepEqual(r.alertas.fechadaComAberto.map((x) => x.titulo), ["Notícias"]);
  assert.deepEqual(r.alertas.vazias.map((x) => x.titulo), ["Vazia"]);
  assert.match(r.frase, /^1 de 3 entregas prontas em 3 Features\./);
});

test("montarCronograma por Feature: desenha só a Feature, mas o risco olha o épico todo", () => {
  const ps = [pbi(1, "XVIA\\Sprint 5", { featureId: 9, coluna: "A fazer" }), pbi(2, "XVIA\\Sprint 7", { featureId: 2, coluna: "A fazer", dependeDe: [1] })];
  const c = montarCronograma(ps, sprints, 1, HOJE, 2);
  assert.equal(c.contagem.total, 1);
  assert.equal(c.situacao.get(2), "risco");
});

test("montarCronograma: legado SGD sai da contagem de atraso; frase diz o que está pronto", () => {
  const ps = [
    pbi(1, "XVIA\\Sprint 6", { trava: [2] }), pbi(2, "XVIA\\Sprint 7"),
    pbi(3, "XVIA\\Sprint 4", { frente: "SGD", titulo: "[SGD] - antigo" }),
    pbi(4, "XVIA\\Sprint 4", { estado: "Done" }),
  ];
  const c = montarCronograma(ps, sprints, 1, HOJE);
  assert.deepEqual(c.legado.map((p) => p.id), [3]);
  assert.equal(c.contagem.atrasado, 0);
  assert.deepEqual(c.blocos[0].pbis.map((p) => p.id), [1, 2]);
  assert.match(c.frase, /^1 de 3 entregas estão prontas/);
});
