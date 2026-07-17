import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularInsightBusca } from "./insights.ts";

const TERMOS = [
  { termo: "ipva", buscas: 833 },
  { termo: "detran", buscas: 100 },
  { termo: "cnh", buscas: 67 },
];

test("calcularInsightBusca: sem total real, % sai sobre a lista truncada e avisa a base", () => {
  const r = calcularInsightBusca(TERMOS);
  assert.equal(r?.termo, "ipva");
  assert.equal(r?.baseTotalReal, false);
  assert.equal(Math.round(r!.participacaoPct), 83); // 833 / 1000 (só os listados)
});

test("calcularInsightBusca: com total real, % sai sobre todas as buscas", () => {
  const r = calcularInsightBusca(TERMOS, 3351);
  assert.equal(r?.baseTotalReal, true);
  assert.equal(Math.round(r!.participacaoPct), 25); // 833 / 3351 — bem menor que os 83% enganosos
});

test("calcularInsightBusca: lista vazia -> null", () => {
  assert.equal(calcularInsightBusca([]), null);
});

test("calcularInsightBusca: total zero não divide por zero", () => {
  const r = calcularInsightBusca(TERMOS, 0);
  assert.equal(r?.participacaoPct, 0);
});
