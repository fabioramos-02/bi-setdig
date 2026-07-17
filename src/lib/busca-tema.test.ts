import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarTemaBusca, agruparPorTema, gerarResumoBusca } from "./busca-tema.ts";

test("classificarTemaBusca: casa por palavra-chave, ignora acento e caixa", () => {
  assert.equal(classificarTemaBusca("IPVA"), "Tributação e Impostos");
  assert.equal(classificarTemaBusca("Inscrição Estadual"), "Tributação e Impostos");
  assert.equal(classificarTemaBusca("procon"), "Defesa do Consumidor");
  assert.equal(classificarTemaBusca("RG"), "Documentos e Identidade");
});

test("classificarTemaBusca: termo sem regra -> Outros assuntos (nunca força)", () => {
  assert.equal(classificarTemaBusca("gestão pública"), "Outros assuntos");
});

const TERMOS = [
  { termo: "ipva", buscas: 1126 },
  { termo: "inscrição estadual", buscas: 786 },
  { termo: "procon", buscas: 379 },
  { termo: "rg", buscas: 14 },
  { termo: "gestão pública", buscas: 10 },
];

test("agruparPorTema: soma por tema e % sobre o total da lista, ordenado desc", () => {
  const r = agruparPorTema(TERMOS);
  assert.equal(r[0].tema, "Tributação e Impostos");
  assert.equal(r[0].buscas, 1912); // 1126 + 786
  const total = TERMOS.reduce((a, t) => a + t.buscas, 0);
  assert.equal(Math.round(r[0].participacaoPct), Math.round((1912 / total) * 100));
});

test("agruparPorTema: lista vazia -> lista vazia", () => {
  assert.deepEqual(agruparPorTema([]), []);
});

test("gerarResumoBusca: 3 partes, sem julgar a navegação", () => {
  const temas = agruparPorTema(TERMOS);
  const insight = { termo: "ipva", buscas: 1126, participacaoPct: 33, baseTotalReal: true };
  const r = gerarResumoBusca(insight, temas, "no mês");
  assert.ok(r);
  assert.match(r!.oQueAconteceu, /"ipva".*33%.*todas as buscas/);
  assert.match(r!.oQueSignifica, /Tributação e Impostos/);
  assert.doesNotMatch(r!.oQueSignifica, /ruim|problema/i);
  assert.doesNotMatch(r!.oportunidade, /ruim|problema/i);
});

test("gerarResumoBusca: sem baseTotalReal, rótulo declara a base truncada", () => {
  const temas = agruparPorTema(TERMOS);
  const insight = { termo: "ipva", buscas: 1126, participacaoPct: 59, baseTotalReal: false };
  const r = gerarResumoBusca(insight, temas, "no mês");
  assert.match(r!.oQueAconteceu, /das buscas registradas/);
});

test("gerarResumoBusca: temas vazios -> null (nunca card pela metade)", () => {
  const insight = { termo: "ipva", buscas: 10, participacaoPct: 100, baseTotalReal: false };
  assert.equal(gerarResumoBusca(insight, [], "no mês"), null);
});
