import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirOrgao, agregarGoverno, type LinhaCensal, type OrgaoCenso } from "./censo.ts";

const carta = (nivel: number, falaSistema = false): LinhaCensal => ({
  id: String(Math.random()),
  titulo: "x",
  nomePopular: "",
  slug: "",
  urlServico: "",
  urlExterno: null,
  nivel,
  etapaBloqueio: "",
  falaSistema,
  sistemaCitado: "",
  justificativa: "",
});

test("resumirOrgao: pctDigital conta níveis 3–4", () => {
  // 5 cartas: níveis 0,2,3,4,4 → digital = 3 de 5 = 60%
  const r = resumirOrgao([carta(0), carta(2), carta(3), carta(4), carta(4)]);
  assert.equal(r.total, 5);
  assert.equal(r.nDigital, 3);
  assert.equal(r.pctDigital, 60);
  assert.equal(r.n4, 2);
});

test("resumirOrgao: aUmPasso conta níveis 2–3", () => {
  const r = resumirOrgao([carta(0), carta(2), carta(3), carta(4)]);
  assert.equal(r.aUmPasso, 2); // o nível 2 e o nível 3
});

test("resumirOrgao: distribuição sempre traz as 5 faixas e soma o total", () => {
  const r = resumirOrgao([carta(0), carta(0), carta(4)]);
  assert.equal(r.distribuicao.length, 5);
  assert.equal(r.distribuicao[0].qtd, 2);
  assert.equal(r.distribuicao[4].qtd, 1);
  assert.equal(r.distribuicao.reduce((s, d) => s + d.qtd, 0), r.total);
});

test("resumirOrgao: nFalaSistema conta o flag", () => {
  const r = resumirOrgao([carta(1, true), carta(2, true), carta(0, false)]);
  assert.equal(r.nFalaSistema, 2);
});

test("agregarGoverno: soma órgãos e ranqueia por pctDigital desc", () => {
  const orgaos: OrgaoCenso[] = [
    { orgaoSigla: "A", orgaoNome: "Órgão A", cartas: [carta(0), carta(0)] }, // 0% digital
    { orgaoSigla: "B", orgaoNome: "Órgão B", cartas: [carta(4), carta(4)] }, // 100% digital
  ];
  const p = agregarGoverno(orgaos);
  assert.equal(p.nOrgaos, 2);
  assert.equal(p.total, 4);
  assert.equal(p.pctDigital, 50); // 2 digitais de 4
  assert.equal(p.orgaos[0].sigla, "B"); // mais maduro primeiro
  assert.equal(p.orgaos[1].sigla, "A");
});
