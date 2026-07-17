import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularServicoTop,
  calcularOrgaoTop,
  pctSemOrgao,
  fraseServicoOrgao,
  recomendacaoConcentracao,
} from "./servicos-portal.ts";
import type { ServicoAcessado, DemandaOrgao } from "./data.ts";

const servicos: ServicoAcessado[] = [
  { servico: "IPVA - consulta de débito", orgaoSigla: "SEFAZ MS", path: "/financas-e-impostos/ipva-consulta-de-debito54", visitas: 100 },
  { servico: "Emitir CRLV", orgaoSigla: "DETRAN", path: "/transito-e-transportes/emitir-crlv13", visitas: 50 },
  { servico: "Página sem match", orgaoSigla: null, path: "/categoria-nova/slug1", visitas: 50 },
];

test("calcularServicoTop: pega o primeiro (lista já vem ordenada)", () => {
  const top = calcularServicoTop(servicos);
  assert.equal(top?.nome, "IPVA - consulta de débito");
  assert.equal(top?.orgaoSigla, "SEFAZ MS");
  assert.equal(top?.href, "https://www.ms.gov.br/financas-e-impostos/ipva-consulta-de-debito54");
});

test("calcularServicoTop: lista vazia -> null", () => {
  assert.equal(calcularServicoTop([]), null);
});

test("pctSemOrgao: proporção das visitas sem órgão identificado", () => {
  assert.equal(pctSemOrgao(servicos), 25); // 50 / 200
});

test("pctSemOrgao: sem visitas -> 0, não divide por zero", () => {
  assert.equal(pctSemOrgao([]), 0);
});

const demanda: DemandaOrgao[] = [
  { orgaoSigla: "SEFAZ MS", orgao: "Secretaria de Estado de Fazenda de Mato Grosso do Sul", visitas: 100, pct: 45 },
  { orgaoSigla: "DETRAN", orgao: "Departamento Estadual de Trânsito de Mato Grosso do Sul", visitas: 50, pct: 25 },
];

test("calcularOrgaoTop: pega o primeiro", () => {
  assert.equal(calcularOrgaoTop(demanda)?.orgaoSigla, "SEFAZ MS");
});

test("fraseServicoOrgao: junta serviço + órgão numa frase só", () => {
  const frase = fraseServicoOrgao(calcularServicoTop(servicos), calcularOrgaoTop(demanda));
  assert.match(frase!, /IPVA - consulta de débito/);
  assert.match(frase!, /45% da demanda/);
});

test("fraseServicoOrgao: sem nenhum dos dois -> null", () => {
  assert.equal(fraseServicoOrgao(null, null), null);
});

test("recomendacaoConcentracao: >=40% gera recomendação", () => {
  const r = recomendacaoConcentracao(calcularOrgaoTop(demanda));
  assert.match(r!.texto, /45%/);
});

test("recomendacaoConcentracao: abaixo do limiar -> null", () => {
  assert.equal(recomendacaoConcentracao({ orgaoSigla: "X", orgao: "X", visitas: 10, pct: 39 }), null);
});
