import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarFiltroPeriodo, resumoDoPeriodo, type PeriodoState } from "./period-filter";
import type { VisitaDiaria } from "./data.ts";

const dados: VisitaDiaria[] = [
  { data: "2026-01-01", visitas: 10, visitantesUnicos: 8, acoes: 20 },
  { data: "2026-01-02", visitas: 20, visitantesUnicos: 15, acoes: 40 },
  { data: "2026-02-01", visitas: 30, visitantesUnicos: 25, acoes: 60 },
  { data: "2027-01-01", visitas: 40, visitantesUnicos: 35, acoes: 80 },
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

test("resumoDoPeriodo soma o bucket do mes de referencia", () => {
  const r = resumoDoPeriodo(dados, { tipo: "mes", dataRef: "2026-01-15" });
  assert.equal(r.visitas, 30); // 10 + 20 (jan/2026)
  assert.equal(r.acoes, 60); // 20 + 40
  assert.equal(r.visitantesUnicos, 23); // 8 + 15 (aproximação, soma diária)
});

test("resumoDoPeriodo ano soma o ano de referencia", () => {
  const r = resumoDoPeriodo(dados, { tipo: "ano", dataRef: "2026-06-01" });
  assert.equal(r.visitas, 60); // 10 + 20 + 30 (todo 2026)
  assert.equal(r.acoes, 120);
});

test("resumoDoPeriodo intervalo soma o range", () => {
  const r = resumoDoPeriodo(dados, { tipo: "intervalo", dataRef: "", inicio: "2026-01-01", fim: "2026-01-31" });
  assert.equal(r.visitas, 30);
});
