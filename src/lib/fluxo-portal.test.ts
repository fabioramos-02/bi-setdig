import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarResumoFluxo } from "./fluxo-portal.ts";
import { calcularComposicaoPaginas } from "./paginas-portal.ts";

const ENTRADAS_CLASSIFICADAS = [
  { tipo: "pagina-inicial" as const, nome: "Página inicial", visitas: 250 },
  { tipo: "servico" as const, nome: "Emitir guia de licenciamento anual", orgaoSigla: "DETRAN", visitas: 150 },
  { tipo: "servico" as const, nome: "IPVA - consulta de débito", orgaoSigla: "SEFAZ MS", visitas: 100 },
  { tipo: "orgao" as const, nome: "Serviços do Órgão JUCEMS", orgaoSigla: "JUCEMS", visitas: 50 },
];
const SAIDAS = [
  { nome: "SEFAZ MS", orgaoSigla: "SEFAZ MS", saidas: 300 },
  { nome: "DETRAN", orgaoSigla: "DETRAN", saidas: 200 },
];

test("gerarResumoFluxo: 3 partes com dado real, nunca 'funil'/'conversão'/'abandono' sem contexto", () => {
  const composicao = calcularComposicaoPaginas(ENTRADAS_CLASSIFICADAS, 1000)!; // total real = 1000
  const servicos = ENTRADAS_CLASSIFICADAS.filter((p) => p.tipo === "servico");
  const r = gerarResumoFluxo(composicao, servicos, SAIDAS, "no mês");
  assert.ok(r);
  assert.match(r!.comoChegam, /25%/); // 250/1000
  assert.match(r!.comoChegam, /Emitir guia de licenciamento anual/);
  assert.match(r!.paraOndeSeguem, /SEFAZ MS/);
  assert.match(r!.paraOndeSeguem, /DETRAN/);
  assert.match(r!.paraOndeSeguem, /continuidade|integrar/i); // não é abandono
  const textoCompleto = `${r!.comoChegam} ${r!.paraOndeSeguem} ${r!.oportunidade}`;
  assert.doesNotMatch(textoCompleto, /funil|convers[aã]o/i);
  assert.doesNotMatch(textoCompleto, /\babandon/i);
});

test("gerarResumoFluxo: sem saidas, texto honesto (nao inventa orgao)", () => {
  const composicao = calcularComposicaoPaginas(ENTRADAS_CLASSIFICADAS, 1000)!;
  const servicos = ENTRADAS_CLASSIFICADAS.filter((p) => p.tipo === "servico");
  const r = gerarResumoFluxo(composicao, servicos, [], "no mês");
  assert.match(r!.paraOndeSeguem, /não há registro/i);
});

test("gerarResumoFluxo: sem home nem servico -> null", () => {
  const composicao = { homeVisitas: 0, homePctDoTotal: 0, acaoVisitas: 0, acaoPct: 0, apoioPct: 0 };
  assert.equal(gerarResumoFluxo(composicao, [], [], "no mês"), null);
});

test("gerarResumoFluxo: um orgao/servico so nao quebra a listagem (sem 'e' sobrando)", () => {
  const composicao = calcularComposicaoPaginas(ENTRADAS_CLASSIFICADAS, 1000)!;
  const servicos = ENTRADAS_CLASSIFICADAS.filter((p) => p.tipo === "servico").slice(0, 1);
  const r = gerarResumoFluxo(composicao, servicos, [SAIDAS[0]], "no mês");
  assert.match(r!.paraOndeSeguem, /para SEFAZ MS —/); // sem "e algo" sobrando (1 item só)
});
