import { test } from "node:test";
import assert from "node:assert/strict";
import { linhasPrioridades } from "./xvia-prioridades.ts";
import { listaDoCronograma } from "./cronograma-lista.ts";
import { montarCronograma } from "./cronograma.ts";
import type { TfsItem, TfsSprint } from "./tfs.ts";

const item = (id: number, extra: Partial<TfsItem> = {}): TfsItem => ({
  id, tipo: "Product Backlog Item", titulo: `Entrega ${id}`, estado: "Committed", coluna: "Em Desenvolvimento",
  area: "XVIA", frente: "X-VIA", sprint: "XVIA\\Sprint 1", epicoId: 1, epico: "CMS", featureId: 2, feature: "Cartas", pbiId: null,
  orgao: null, tags: [], tipoEntrega: null, pendencia: false, criadoEm: null, alteradoEm: null, fechadoEm: null, prazo: null,
  diasSemAtualizar: null, atividadeUst: null, complexidadeUst: null, ust: null, dataExecucao: null, codigoCatalogo: null, dependeDe: [], trava: [], ...extra,
});
const sprints: TfsSprint[] = [{ sprint: "XVIA\\Sprint 1", nome: "Sprint 1", inicio: "2026-10-01", fim: "2026-10-14", situacao: "encerrada" }];

test("fila preserva decisão antes de impedimento e não duplica entrega também atrasada", () => {
  const linhas = linhasPrioridades([item(1, { diasSemAtualizar: 90 }), item(2, { coluna: "Impedido", pendencia: true, diasSemAtualizar: 40 }), item(3, { coluna: "Aguardando decisão", pendencia: true, diasSemAtualizar: 2 })], sprints, "2026-11-11");
  assert.deepEqual(linhas.map((l) => l.id), [3, 2, 1]);
  assert.equal(linhas[0].motivo, "Aguardando decisão e atrasada");
  assert.equal(linhas[0].acao, "Decidir");
});

test("alternativa textual conserva cadeias, situação, predecessores e itens sem dependência", () => {
  const itens = [item(1, { estado: "Done" }), item(2, { dependeDe: [1], trava: [3] }), item(3, { dependeDe: [2] }), item(4)];
  const c = montarCronograma(itens, sprints, 1, "2026-11-11", 2);
  const lista = listaDoCronograma(c);
  assert.equal(new Set(lista.map((l) => l.item.id)).size, 4);
  const meio = lista.find((l) => l.item.id === 2)!;
  assert.deepEqual(meio.antes.map((p) => p.id), [1]);
  assert.deepEqual(meio.depois.map((p) => p.id), [3]);
  assert.equal(meio.situacao, c.situacao.get(2));
  assert.equal(lista.find((l) => l.item.id === 1)?.situacao, "concluido");
});
