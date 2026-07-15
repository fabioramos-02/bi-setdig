import { test } from "node:test";
import assert from "node:assert/strict";
import { prazoServico, labelCategoria } from "./servicos.ts";

test("prazoServico antepõe número só em unidade temporal", () => {
  assert.equal(prazoServico(90, "Dias corridos"), "90 Dias corridos");
  assert.equal(prazoServico(15, "Dias úteis"), "15 Dias úteis");
  assert.equal(prazoServico(6, "Meses"), "6 Meses");
  assert.equal(prazoServico(1, "Acesso Imediato"), "Acesso Imediato"); // não vira "1 Acesso Imediato"
  assert.equal(prazoServico(0, "Conforme Tabela em Outras Informações"), "Conforme Tabela em Outras Informações");
  assert.equal(prazoServico(null, null), "—");
});

test("labelCategoria formata slug", () => {
  assert.equal(labelCategoria("saude-e-cuidado"), "Saude e cuidado");
  assert.equal(labelCategoria(null), "Sem categoria");
});
