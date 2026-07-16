import { test } from "node:test";
import assert from "node:assert/strict";
import { idsExcluidos, formatarExtracao, type SecaoExport } from "./relatorio.ts";

const SECOES: SecaoExport[] = [
  { id: "a", label: "1. Visão Geral" },
  { id: "b", label: "2. Explorar" },
  { id: "c", label: "3. Órgãos" },
];

test("idsExcluidos: selecionar tudo → nada excluído (PDF sai completo)", () => {
  assert.deepEqual(idsExcluidos(SECOES, ["a", "b", "c"]), []);
});

test("idsExcluidos: subconjunto → exclui o complemento", () => {
  assert.deepEqual(idsExcluidos(SECOES, ["b"]), ["a", "c"]);
});

test("idsExcluidos: nenhuma selecionada → exclui todas", () => {
  assert.deepEqual(idsExcluidos(SECOES, []), ["a", "b", "c"]);
});

test("idsExcluidos: id inexistente na seleção é ignorado (não quebra)", () => {
  assert.deepEqual(idsExcluidos(SECOES, ["a", "zzz"]), ["b", "c"]);
});

test("idsExcluidos: aceita Set além de array", () => {
  assert.deepEqual(idsExcluidos(SECOES, new Set(["c"])), ["a", "b"]);
});

test("formatarExtracao: data conhecida no padrão pt-BR", () => {
  // 16/07/2026 14:32 (mês 6 = julho, 0-indexado)
  const d = new Date(2026, 6, 16, 14, 32);
  assert.equal(formatarExtracao(d), "16 de julho de 2026 às 14h32");
});

test("formatarExtracao: zero-pad de hora/minuto", () => {
  const d = new Date(2026, 0, 3, 9, 5);
  assert.equal(formatarExtracao(d), "3 de janeiro de 2026 às 09h05");
});
