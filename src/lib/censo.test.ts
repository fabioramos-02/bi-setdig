import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirOrgao, agregarGoverno, matrizImpactoEsforco, quadranteDe, type LinhaCensal, type OrgaoCenso } from "./censo.ts";

const carta = (nivel: number | null, demandaMensal: number | null = null): LinhaCensal => ({
  id: String(Math.random()),
  titulo: "x",
  setor: null,
  nivel,
  etapaPresencial: null,
  demandaMensal,
  demandaTexto: null,
  slug: null,
  urlServico: null,
});

test("resumirOrgao: pctDigital conta níveis 4–5 sobre quem informou o grau", () => {
  // níveis 0,2,3,4,5 + 1 sem grau → digital = 2 de 5 informados = 40%
  const r = resumirOrgao([carta(0), carta(2), carta(3), carta(4), carta(5), carta(null)]);
  assert.equal(r.total, 6);
  assert.equal(r.nSemNivel, 1);
  assert.equal(r.nDigital, 2);
  assert.equal(r.pctDigital, 40);
  assert.equal(r.nTopo, 1);
  assert.equal(r.nExigenciaLegal, 1);
});

test("resumirOrgao: oportunidades conta níveis 1–2, não o 3 (exigência legal)", () => {
  const r = resumirOrgao([carta(1), carta(2), carta(3), carta(4)]);
  assert.equal(r.oportunidades, 2);
});

test("resumirOrgao: distribuição traz as 6 faixas e soma quem informou o grau", () => {
  const r = resumirOrgao([carta(0), carta(0), carta(5), carta(null)]);
  assert.equal(r.distribuicao.length, 6);
  assert.equal(r.distribuicao[0].qtd, 2);
  assert.equal(r.distribuicao[5].qtd, 1);
  assert.equal(r.distribuicao.reduce((s, d) => s + d.qtd, 0), r.total - r.nSemNivel);
});

test("resumirOrgao: demanda digital é % da demanda informada, ignora nulos", () => {
  // 300 online (níveis 4 e 5) de 400 informados; a carta sem número fica fora
  const r = resumirOrgao([carta(4, 100), carta(5, 200), carta(1, 100), carta(2, null)]);
  assert.equal(r.nComDemanda, 3);
  assert.equal(r.demandaTotal, 400);
  assert.equal(r.demandaDigital, 300);
  assert.equal(r.pctDemandaDigital, 75);
});

test("matrizImpactoEsforco: esforço corta em 2|3, impacto estritamente acima da mediana", () => {
  const orgaos: OrgaoCenso[] = [
    // demandas 10, 20, 30, 40, 50 → mediana 30
    { orgaoSigla: "A", orgaoNome: "A", cartas: [carta(2, 50), carta(3, 40), carta(5, 30), carta(0, 10), carta(4, 20)] },
    { orgaoSigla: "B", orgaoNome: "B", cartas: [carta(1, null), carta(null, 99)] },
  ];
  const m = matrizImpactoEsforco(orgaos);
  assert.equal(m.mediana, 30);
  assert.deepEqual(m.quadrantes.estruturante.map((c) => c.nivel), [2]); // 50, nível 2
  assert.deepEqual(m.quadrantes.rapido.map((c) => c.nivel), [3]); // 40, nível 3
  assert.deepEqual(m.quadrantes.oportuno.map((c) => c.demandaMensal), [30, 20]); // na mediana = baixo impacto
  assert.deepEqual(m.quadrantes.evitar.map((c) => c.nivel), [0]);
  assert.equal(m.semDemanda, 1);
  assert.equal(m.semNivel, 1);
});

test("quadranteDe: sem nível ou sem demanda não tem quadrante", () => {
  assert.equal(quadranteDe({ nivel: null, demandaMensal: 5 }, 1), null);
  assert.equal(quadranteDe({ nivel: 4, demandaMensal: null }, 1), null);
  assert.equal(quadranteDe({ nivel: 5, demandaMensal: 0 }, 1), "oportuno");
});

test("agregarGoverno: soma órgãos, ranqueia por pctDigital e separa quem não respondeu", () => {
  const orgaos: OrgaoCenso[] = [
    { orgaoSigla: "A", orgaoNome: "Órgão A", cartas: [carta(0), carta(1)] }, // 0% digital
    { orgaoSigla: "B", orgaoNome: "Órgão B", cartas: [carta(4), carta(5)] }, // 100% digital
    { orgaoSigla: "C", orgaoNome: "Órgão C", cartas: [] },
  ];
  const p = agregarGoverno(orgaos);
  assert.equal(p.nOrgaos, 2);
  assert.equal(p.total, 4);
  assert.equal(p.pctDigital, 50);
  assert.deepEqual(p.orgaos.map((o) => o.sigla), ["B", "A"]);
  assert.deepEqual(p.semResposta, ["C"]);
});
