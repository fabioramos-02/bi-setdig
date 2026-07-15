import { test } from "node:test";
import assert from "node:assert/strict";
import { visitsDaily } from "./matomo-transform.ts";

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
