import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrarOrdenarLinhas, paginarLinhas } from "./table-view.ts";

test("busca e ordenação usam a coleção inteira antes da página, sem mutar a entrada", () => {
  const rows = [{ nome: "Órgão A", n: 2 }, { nome: "Outro", n: 9 }, { nome: "Órgão B", n: 8 }];
  const r = filtrarOrdenarLinhas(rows, "orgao", (r) => r.nome, (a, b) => b.n - a.n);
  assert.deepEqual(r.map((x) => x.n), [8, 2]);
  assert.equal(paginarLinhas(r, 1, 1).linhas[0].n, 8);
  assert.deepEqual(rows.map((x) => x.n), [2, 9, 8]);
});

test("página limitada à coleção nova, vazio explícito e sem limite mantém todos", () => {
  assert.deepEqual(paginarLinhas([1, 2, 3], 9, 2), { pagina: 2, paginas: 2, total: 3, inicio: 3, fim: 3, linhas: [3] });
  assert.deepEqual(paginarLinhas([], 4, 25), { pagina: 1, paginas: 1, total: 0, inicio: 0, fim: 0, linhas: [] });
  assert.deepEqual(paginarLinhas([1, 2, 3], 1).linhas, [1, 2, 3]);
});
