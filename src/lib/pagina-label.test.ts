import { test } from "node:test";
import assert from "node:assert/strict";
import { labelPagina } from "./pagina-label.ts";
import { construirContexto } from "./pagina-tipo.ts";
import type { CartaRelacao } from "@/lib/data";

test("Others -> agregado, sem link", () => {
  assert.deepEqual(labelPagina("Others"), { label: "Outras (agregado)" });
});

test("sem ctx: fallback original (path cru, host despido)", () => {
  const r = labelPagina("https://www.ms.gov.br/algum-caminho");
  assert.equal(r.label, "/algum-caminho");
});

test("sem ctx: home -> Página inicial", () => {
  assert.equal(labelPagina("/").label, "Página inicial");
});

test("com ctx: delega ao classificador (nome real da carta, não o path)", () => {
  const carta: CartaRelacao = {
    titulo: "Emitir CRLV",
    nomePopular: null,
    slug: "emitir-crlv13",
    orgao: "DETRAN",
    orgaoSigla: "DETRAN",
    setor: null,
    categoria: "transito-e-transportes",
    publico: null,
    publicoEspecifico: [],
    ativo: true,
    digital: false,
    online: false,
    destaque: false,
    custo: null,
    tempoTotal: null,
    tipoTempo: null,
    updatedAt: null,
  };
  const ctx = construirContexto([carta]);
  const r = labelPagina("https://www.ms.gov.br/transito-e-transportes/emitir-crlv13", ctx);
  assert.equal(r.label, "Emitir CRLV");
});
