import { test } from "node:test";
import assert from "node:assert/strict";
import { arestas, cadeias, montarCronograma, situacoes } from "./cronograma.ts";
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
