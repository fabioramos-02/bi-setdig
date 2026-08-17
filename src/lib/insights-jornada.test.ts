import { test } from "node:test";
import assert from "node:assert/strict";
import { fraseCadencia, interpretaStickiness } from "./insights-jornada.ts";
import type { FrequenciaAcesso } from "./data.ts";

const BASE: FrequenciaAcesso = {
  ativosHoje: 90000,
  ativosSemana: 450000,
  ativosMes: 1150000,
  totalUsuariosMes: 110000,
  sessoesMes: 130000,
  stickinessPct: 7.8,
  fidelidadeSemanaPct: 39.4,
  sessoesPorUsuario: 1.2,
  diasEntreAcessos: 23.3,
  cohortSemana: "2026-08-10 a 2026-08-16",
  cohortTamanho: 1905,
  retencaoD1Pct: 14.8,
  retencaoD7Pct: 0.2,
  retencaoD30Pct: 0.0,
};

test("fraseCadencia formata intervalo em dias", () => {
  const f = fraseCadencia(BASE);
  assert.match(f, /23 dias/);
});

test("fraseCadencia degrada sem dado", () => {
  const f = fraseCadencia({ ...BASE, diasEntreAcessos: null });
  assert.match(f, /não há dados suficientes/);
});

test("fraseCadencia lida com <2 dias", () => {
  const f = fraseCadencia({ ...BASE, diasEntreAcessos: 1.4 });
  assert.match(f, /menos de 2 dias/);
});

test("interpretaStickiness classifica engajamento", () => {
  assert.match(interpretaStickiness({ ...BASE, stickinessPct: 25 }), /engajada/);
  assert.match(interpretaStickiness({ ...BASE, stickinessPct: 15 }), /moderado/);
  assert.match(interpretaStickiness({ ...BASE, stickinessPct: 5 }), /Baixa/);
});
