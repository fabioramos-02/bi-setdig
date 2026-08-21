import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  agregarPorOrgao,
  destinosPorHost,
  fraseAncoraAcessos,
  orgaosDisponiveis,
  totalCliques,
} from "./insights-acessos-botao.ts";
import type { AcessoBotaoCarta } from "./data.ts";

const carta = (over: Partial<AcessoBotaoCarta> = {}): AcessoBotaoCarta => ({
  slug: "s",
  titulo: "T",
  orgaoSigla: null,
  categoria: null,
  urlCarta: "https://www.ms.gov.br/x/s",
  urlExterno: "https://sistema.ms.gov.br/",
  cliques: 100,
  ...over,
});

test("totalCliques — soma simples", () => {
  assert.equal(totalCliques([carta({ cliques: 10 }), carta({ cliques: 20 })]), 30);
  assert.equal(totalCliques([]), 0);
});

test("destinosPorHost — agrupa mesmo host, remove www, ordena por cliques desc", () => {
  const cartas = [
    carta({ slug: "a", urlExterno: "https://www.meudetran.ms.gov.br/veiculo", cliques: 80 }),
    carta({ slug: "b", urlExterno: "https://meudetran.ms.gov.br/multa", cliques: 20 }),
    carta({ slug: "c", urlExterno: "https://efazenda.ms.gov.br/x", cliques: 50 }),
  ];
  const r = destinosPorHost(cartas, 5);
  assert.equal(r.length, 2);
  assert.equal(r[0].host, "meudetran.ms.gov.br");
  assert.equal(r[0].cliques, 100);
  assert.equal(r[0].cartas, 2);
  assert.equal(r[1].host, "efazenda.ms.gov.br");
});

test("destinosPorHost — URL inválida vira fallback (não crasha)", () => {
  const r = destinosPorHost([carta({ urlExterno: "url-quebrada" })], 5);
  assert.equal(r[0].host, "url-quebrada");
});

test("agregarPorOrgao — soma cliques por sigla, ordena desc", () => {
  const cartas = [
    carta({ slug: "a", orgaoSigla: "DETRAN", cliques: 100, titulo: "IPVA" }),
    carta({ slug: "b", orgaoSigla: "DETRAN", cliques: 50, titulo: "CNH" }),
    carta({ slug: "c", orgaoSigla: "SEFAZ", cliques: 200, titulo: "ITCD" }),
  ];
  const r = agregarPorOrgao(cartas);
  assert.equal(r[0].orgaoSigla, "SEFAZ");
  assert.equal(r[0].cliques, 200);
  assert.equal(r[1].orgaoSigla, "DETRAN");
  assert.equal(r[1].cartas, 2);
  assert.equal(r[1].cliques, 150);
  assert.equal(r[1].destinoPrincipal, "IPVA");
  assert.equal(r[1].cliquesDestinoPrincipal, 100);
});

test("agregarPorOrgao — orgão null vira 'Sem órgão'", () => {
  const r = agregarPorOrgao([carta({ orgaoSigla: null })]);
  assert.equal(r[0].orgaoSigla, "Sem órgão");
});

test("orgaosDisponiveis — alfabético, sem null, sem dup", () => {
  const cartas = [carta({ orgaoSigla: "SEFAZ" }), carta({ orgaoSigla: "DETRAN" }), carta({ orgaoSigla: null })];
  assert.deepEqual(orgaosDisponiveis(cartas), ["DETRAN", "SEFAZ"]);
});

test("fraseAncoraAcessos — vazio degrada honestamente", () => {
  const r = fraseAncoraAcessos([]);
  assert.equal(r.semDado, true);
  assert.match(r.fraseAncora, /Ainda não há/);
});

test("fraseAncoraAcessos — formata pt-BR", () => {
  const r = fraseAncoraAcessos([carta({ cliques: 1234, titulo: "IPVA" })]);
  assert.equal(r.semDado, false);
  assert.match(r.fraseAncora, /1\.234 cliques/);
  assert.match(r.fraseAncora, /IPVA/);
});

test("fraseAncoraAcessos — modo órgão personaliza escopo", () => {
  const r = fraseAncoraAcessos([carta({ cliques: 500, titulo: "IPVA" })], "DETRAN");
  assert.match(r.fraseAncora, /cartas de DETRAN/);
});
