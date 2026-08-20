import { test } from "node:test";
import assert from "node:assert/strict";
import { orgaosDe } from "./catalogo-app.ts";
import type { CategoriaOrgaos } from "./data.ts";

const MAPA: CategoriaOrgaos = {
  Agronegócio: ["IAGRO", "SEMADESC"],
  Saúde: ["SES"],
};

test("orgaosDe devolve lista quando categoria existe", () => {
  assert.deepEqual(orgaosDe("Agronegócio", MAPA), ["IAGRO", "SEMADESC"]);
});

test("orgaosDe devolve array vazio quando categoria não está mapeada", () => {
  assert.deepEqual(orgaosDe("Coronavírus", MAPA), []);
});

test("orgaosDe preserva ordem do mapa", () => {
  assert.equal(orgaosDe("Agronegócio", MAPA)[0], "IAGRO");
});
