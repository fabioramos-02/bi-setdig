import { test } from "node:test";
import assert from "node:assert/strict";
import { agregarPorCarta, cartasDosAcessos, maisAcessadas } from "./acessos-cartas.ts";
import type { CartaRelacao } from "./data.ts";

const rel = (slug: string, orgaoSigla: string, setor: string | null, ativo = true) =>
  ({ slug, titulo: slug.toUpperCase(), orgaoSigla, setor, categoria: "financas-e-impostos", ativo }) as unknown as CartaRelacao;

const RELACAO = [rel("a", "SEFAZ MS", "Fiscal"), rel("b", "DETRAN", null), rel("c", "SEFAZ MS", "Fiscal"), rel("d", "DETRAN", null, false)];

test("cartasDosAcessos usa o inventário e descarta inativa ou desconhecida", () => {
  const cartas = cartasDosAcessos([["b", 3], ["a", 10], ["d", 99], ["zz", 5]], RELACAO);
  assert.deepEqual(cartas.map((c) => [c.slug, c.visitas]), [["a", 10], ["b", 3]]);
  assert.equal(cartas[0].url, "https://www.ms.gov.br/financas-e-impostos/a");
});

test("agregarPorCarta soma por órgão e setor", () => {
  const cartas = cartasDosAcessos([["a", 10], ["b", 3], ["c", 4]], RELACAO);
  const { porOrgao, porSetor } = agregarPorCarta(cartas);
  assert.deepEqual(porOrgao, [{ rotulo: "SEFAZ MS", visitas: 14 }, { rotulo: "DETRAN", visitas: 3 }]);
  assert.deepEqual(porSetor, [{ rotulo: "Fiscal — SEFAZ MS", visitas: 14 }]);
});

test("maisAcessadas corta em n e filtra o órgão", () => {
  const cartas = cartasDosAcessos([["a", 10], ["b", 3], ["c", 4]], RELACAO);
  assert.deepEqual(maisAcessadas(cartas, null, 2).map((c) => c.slug), ["a", "c"]);
  assert.deepEqual(maisAcessadas(cartas, "DETRAN").map((c) => c.slug), ["b"]);
});
