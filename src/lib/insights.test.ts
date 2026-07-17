import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularInsightBusca, calcularInsightConcentracaoGeo, calcularInsightHorarioPortal } from "./insights.ts";

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

test("calcularInsightConcentracaoGeo: cidade topo e % sobre as reportadas", () => {
  const r = calcularInsightConcentracaoGeo([
    { cidade: "Campo Grande", visitas: 40 },
    { cidade: "Dourados", visitas: 10 },
  ]);
  assert.equal(r?.cidade, "Campo Grande");
  assert.equal(Math.round(r!.participacaoPct), 80); // 40 / 50
});

test("calcularInsightConcentracaoGeo: lista vazia -> null", () => {
  assert.equal(calcularInsightConcentracaoGeo([]), null);
});

test("calcularInsightHorarioPortal: pega a hora de pico e formata o rótulo cru", () => {
  const r = calcularInsightHorarioPortal([
    { hora: "08", visitas: 100 },
    { hora: "09", visitas: 180 },
    { hora: "10", visitas: 120 },
  ]);
  assert.equal(r?.hora, "09");
  assert.equal(Math.round(r!.participacaoPct), 45); // 180 / 400
});

test("calcularInsightHorarioPortal: lista vazia -> null", () => {
  assert.equal(calcularInsightHorarioPortal([]), null);
});
