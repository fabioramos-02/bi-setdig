import { test } from "node:test";
import assert from "node:assert/strict";
import { visitsDaily, topPages, entryPages, mergeSearch, searchKeywords } from "./matomo-transform.ts";

test("visitsDaily: dict vazio vira array vazio", () => {
  assert.deepEqual(visitsDaily({}), []);
});

test("visitsDaily: ordena por data mesmo se o dict vier fora de ordem", () => {
  const r = visitsDaily({
    "2026-01-03": { nb_visits: 3, nb_uniq_visitors: 2, nb_actions: 5 },
    "2026-01-01": { nb_visits: 1, nb_uniq_visitors: 1, nb_actions: 1 },
    "2026-01-02": { nb_visits: 2, nb_uniq_visitors: 2, nb_actions: 3 },
  });
  assert.deepEqual(
    r.map((x) => x.data),
    ["2026-01-01", "2026-01-02", "2026-01-03"],
  );
  assert.deepEqual(r[0], { data: "2026-01-01", visitas: 1, visitantesUnicos: 1, acoes: 1 });
});

test("visitsDaily: ignora entrada cujo valor não é objeto sem quebrar", () => {
  const r = visitsDaily({
    "2026-01-01": { nb_visits: 1, nb_uniq_visitors: 1, nb_actions: 1 },
    // @ts-expect-error -- simula resposta inesperada da API Matomo
    meta: "algo-nao-objeto",
  });
  assert.equal(r.length, 1);
  assert.equal(r[0].data, "2026-01-01");
});

// Regras espelhadas em data-platform/transform/matomo.py (EXCLUIR_URLS) —
// o Python não tem harness de teste próprio; estes testes cobrem o contrato.

test("topPages: exclui retorno técnico do login e nomeia a home", () => {
  const r = topPages([
    { url: "/login/callback/ - Others", nb_visits: 3426 },
    { url: "/", nb_visits: 100 },
    { url: "/financas-e-impostos/ipva", nb_visits: 50 },
  ]);
  assert.equal(r.length, 2);
  assert.ok(!r.some((p) => p.url.includes("/login/callback")));
  assert.equal(r[0].url, "Página inicial");
});

test("entryPages: mesma exclusão do login, path cru pro classificador resolver (ADR-012)", () => {
  const r = entryPages([
    { label: "/login/callback/ - Others", nb_visits: 999 },
    { label: "/", nb_visits: 10 },
  ]);
  // "/" fica cru — classificarPagina, não entryPages, decide que isso é
  // "Página inicial" (traduzir aqui quebrava a classificação, ver ADR-012).
  assert.deepEqual(r, [{ pagina: "/", entradas: 10 }]);
});

test("searchKeywords: não trunca (o corte é do mergeSearch) e ignora URL como termo", () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ label: `termo${i}`, nb_visits: 25 - i }));
  rows.push({ label: "/pagina/qualquer", nb_visits: 999 });
  const r = searchKeywords(rows);
  assert.equal(r.length, 25);
  assert.ok(!r.some((t) => t.termo.startsWith("/")));
});

test("mergeSearch: total é anterior ao corte do top-N", () => {
  const nativo = [
    { termo: "ipva", buscas: 800 },
    { termo: "detran", buscas: 100 },
  ];
  const deUrls = [
    { termo: "ipva", buscas: 33 }, // soma com o nativo
    { termo: "cnh", buscas: 67 },
  ];
  const { termos, total } = mergeSearch(nativo, deUrls, 1);
  assert.deepEqual(termos, [{ termo: "ipva", buscas: 833 }]); // top-1
  assert.equal(total, 1000); // 833 + 100 + 67 — não só o que sobrou no corte
});
