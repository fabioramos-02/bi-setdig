import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarFiltroPeriodo, type PeriodoState } from "./period-filter.ts";
import type { VisitaDiaria } from "./data.ts";

const dados: VisitaDiaria[] = [
  { data: "2026-01-01", visitas: 10, visitantesUnicos: 8 },
  { data: "2026-01-02", visitas: 20, visitantesUnicos: 15 },
  { data: "2026-02-01", visitas: 30, visitantesUnicos: 25 },
  { data: "2027-01-01", visitas: 40, visitantesUnicos: 35 },
];

test("mes agrega por YYYY-MM", () => {
  const estado: PeriodoState = { tipo: "mes", dataRef: "2027-12-31" };
  const r = aplicarFiltroPeriodo(dados, estado);
  const jan2026 = r.find((p) => p.rotulo === "2026-01");
  assert.equal(jan2026?.visitas, 30); // 10 + 20
});

test("ano agrega por YYYY", () => {
  const estado: PeriodoState = { tipo: "ano", dataRef: "2027-12-31" };
  const r = aplicarFiltroPeriodo(dados, estado);
  assert.equal(r.find((p) => p.rotulo === "2026")?.visitas, 60);
  assert.equal(r.find((p) => p.rotulo === "2027")?.visitas, 40);
});

test("intervalo filtra sem agregar", () => {
  const estado: PeriodoState = { tipo: "intervalo", dataRef: "", inicio: "2026-01-01", fim: "2026-01-31" };
  const r = aplicarFiltroPeriodo(dados, estado);
  assert.equal(r.length, 2);
  assert.equal(r[0].rotulo, "2026-01-01");
});

test("dia respeita dataRef como teto", () => {
  const estado: PeriodoState = { tipo: "dia", dataRef: "2026-01-02" };
  const r = aplicarFiltroPeriodo(dados, estado);
  assert.ok(r.every((p) => p.rotulo <= "2026-01-02"));
});

test("array vazio nao quebra", () => {
  assert.deepEqual(aplicarFiltroPeriodo([], { tipo: "mes", dataRef: "2026-01-01" }), []);
});
