import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarDominio, agruparSaidasPorOrgao } from "./dominio-orgao.ts";

test("classificarDominio: domínios reais mapeiam pro órgão certo", () => {
  assert.equal(classificarDominio("www.meudetran.ms.gov.br").orgaoSigla, "DETRAN");
  assert.equal(classificarDominio("eservicos.sefaz.ms.gov.br").orgaoSigla, "SEFAZ MS");
  assert.equal(classificarDominio("servicos.efazenda.ms.gov.br").orgaoSigla, "SEFAZ MS");
  assert.equal(classificarDominio("portalservicos.jucems.ms.gov.br").orgaoSigla, "JUCEMS");
  assert.equal(classificarDominio("devir.pc.ms.gov.br").orgaoSigla, "PCMS");
  assert.equal(classificarDominio("www.cgp.sejusp.ms.gov.br").orgaoSigla, "CGP");
});

test("classificarDominio: sem órgão específico (SSO), nome amigável sem sigla", () => {
  const r = classificarDominio("e-ms.ms.gov.br");
  assert.equal(r.orgaoSigla, undefined);
  assert.equal(r.nome, "Plataforma e-MS (login único)");
});

test("classificarDominio: domínio desconhecido não inventa órgão (honesto)", () => {
  const r = classificarDominio("www.algum-sistema-novo.ms.gov.br");
  assert.equal(r.orgaoSigla, undefined);
  assert.equal(r.nome, "algum-sistema-novo.ms.gov.br");
});

test("agruparSaidasPorOrgao: soma domínios do mesmo órgão, ordena desc", () => {
  const r = agruparSaidasPorOrgao([
    { dominio: "www.sefaz.ms.gov.br", saidas: 100 },
    { dominio: "eservicos.sefaz.ms.gov.br", saidas: 50 },
    { dominio: "www.meudetran.ms.gov.br", saidas: 80 },
  ]);
  assert.equal(r[0].orgaoSigla, "SEFAZ MS");
  assert.equal(r[0].saidas, 150); // 100 + 50, mesmo órgão
  assert.equal(r[1].orgaoSigla, "DETRAN");
  assert.equal(r[1].saidas, 80);
});

test("agruparSaidasPorOrgao: sem entradas -> lista vazia", () => {
  assert.deepEqual(agruparSaidasPorOrgao([]), []);
});
