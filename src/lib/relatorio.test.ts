import { test } from "node:test";
import assert from "node:assert/strict";
import { idsExcluidos, formatarExtracao, nomeArquivoRelatorio, type SecaoExport } from "./relatorio.ts";

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

const TITULO = "Portal Único | SETDIG";

test("nomeArquivoRelatorio: uma seção → base + nome sem prefixo de ordem", () => {
  assert.equal(nomeArquivoRelatorio(TITULO, [SECOES[1]], 3), "Portal Único - Explorar");
});

test("nomeArquivoRelatorio: todas marcadas → Relatório completo", () => {
  assert.equal(nomeArquivoRelatorio(TITULO, SECOES, 3), "Portal Único - Relatório completo");
});

test("nomeArquivoRelatorio: subconjunto → lista os nomes na ordem das abas", () => {
  assert.equal(nomeArquivoRelatorio(TITULO, [SECOES[0], SECOES[2]], 3), "Portal Único - Visão Geral, Órgãos");
});

test("nomeArquivoRelatorio: sem seção (página sem abas) fica só a base", () => {
  assert.equal(nomeArquivoRelatorio("Censo Digital | SETDIG", [], 0), "Censo Digital");
});

test("nomeArquivoRelatorio: página de 1 aba só, marcada → nome, não 'completo'", () => {
  assert.equal(nomeArquivoRelatorio(TITULO, [SECOES[0]], 1), "Portal Único - Visão Geral");
});

test("nomeArquivoRelatorio: título sem separador não quebra", () => {
  assert.equal(nomeArquivoRelatorio("Portal Único", [SECOES[0]], 3), "Portal Único - Visão Geral");
});
