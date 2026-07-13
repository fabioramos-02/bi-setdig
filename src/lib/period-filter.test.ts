import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aplicarFiltroPeriodo,
  resumoDoPeriodo,
  clampData,
  intervaloDoBucket,
  ehPeriodoCorrente,
  rotuloPeriodoResolvido,
  type PeriodoState,
} from "./period-filter.ts";
import type { VisitaDiaria } from "./data.ts";

const MIN = "2024-01-01";
const MAX = "2026-07-10";

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

// --- helpers de data de referência → range do bucket ---

test("clampData prende no intervalo e trata inválido", () => {
  assert.equal(clampData("2025-06-15", MIN, MAX), "2025-06-15");
  assert.equal(clampData("2020-01-01", MIN, MAX), MIN); // abaixo do min
  assert.equal(clampData("2030-01-01", MIN, MAX), MAX); // acima do max
  assert.equal(clampData("", MIN, MAX), MAX); // vazio
  assert.equal(clampData("2026-13-40", MIN, MAX), MAX); // data impossível
  assert.equal(clampData("banana", MIN, MAX), MAX); // lixo
});

test("intervaloDoBucket mes = 1º ao último dia do mês", () => {
  const r = intervaloDoBucket({ tipo: "mes", dataRef: "2026-05-10" }, MIN, MAX);
  assert.deepEqual(r, { inicio: "2026-05-01", fim: "2026-05-31" });
});

test("intervaloDoBucket fevereiro respeita fim do mês", () => {
  const r = intervaloDoBucket({ tipo: "mes", dataRef: "2024-02-10" }, MIN, MAX); // bissexto
  assert.deepEqual(r, { inicio: "2024-02-01", fim: "2024-02-29" });
});

test("intervaloDoBucket ano = jan a dez", () => {
  const r = intervaloDoBucket({ tipo: "ano", dataRef: "2025-08-01" }, MIN, MAX);
  assert.deepEqual(r, { inicio: "2025-01-01", fim: "2025-12-31" });
});

test("intervaloDoBucket dia = a própria data", () => {
  const r = intervaloDoBucket({ tipo: "dia", dataRef: "2026-03-04" }, MIN, MAX);
  assert.deepEqual(r, { inicio: "2026-03-04", fim: "2026-03-04" });
});

test("intervaloDoBucket semana = segunda a domingo (ISO)", () => {
  // 2026-05-06 é uma quarta; semana ISO = seg 04/05 … dom 10/05
  const r = intervaloDoBucket({ tipo: "semana", dataRef: "2026-05-06" }, MIN, MAX);
  assert.deepEqual(r, { inicio: "2026-05-04", fim: "2026-05-10" });
});

test("intervaloDoBucket clampa nas bordas do dado", () => {
  // mês corrente: fim do mês passa de MAX → clampa em MAX
  const r = intervaloDoBucket({ tipo: "mes", dataRef: "2026-07-05" }, MIN, MAX);
  assert.deepEqual(r, { inicio: "2026-07-01", fim: MAX });
});

test("ehPeriodoCorrente: mês que contém max é corrente; passado não", () => {
  assert.equal(ehPeriodoCorrente({ tipo: "mes", dataRef: "2026-07-01" }, MIN, MAX), true); // jul/2026 contém max
  assert.equal(ehPeriodoCorrente({ tipo: "mes", dataRef: "2026-05-10" }, MIN, MAX), false); // maio é passado
  assert.equal(ehPeriodoCorrente({ tipo: "ano", dataRef: "2026-01-01" }, MIN, MAX), true);
  assert.equal(ehPeriodoCorrente({ tipo: "ano", dataRef: "2025-01-01" }, MIN, MAX), false);
  assert.equal(ehPeriodoCorrente({ tipo: "intervalo", dataRef: "", inicio: MIN, fim: MAX }, MIN, MAX), false);
});

test("rotuloPeriodoResolvido formata cada granularidade", () => {
  assert.equal(rotuloPeriodoResolvido({ tipo: "mes", dataRef: "2026-05-10" }), "maio de 2026");
  assert.equal(rotuloPeriodoResolvido({ tipo: "ano", dataRef: "2025-08-01" }), "2025");
  assert.equal(rotuloPeriodoResolvido({ tipo: "dia", dataRef: "2026-03-04" }), "04/03/2026");
  assert.equal(rotuloPeriodoResolvido({ tipo: "semana", dataRef: "2026-05-06" }), "semana de 04/05/2026 a 10/05/2026");
  assert.equal(rotuloPeriodoResolvido({ tipo: "intervalo", dataRef: "", inicio: "2026-01-01", fim: "2026-01-31" }), "01/01/2026 a 31/01/2026");
});
