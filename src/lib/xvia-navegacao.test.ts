import { test } from "node:test";
import assert from "node:assert/strict";
import { enderecoDoDestino, enderecoSemFiltros, lerNavegacao } from "./xvia-navegacao.ts";

test("aprofundamento mantém quatro filtros e restaura nível e aba ao abrir o endereço", () => {
  const base = new URLSearchParams({ modulo: "CMS", frente: "X-VIA", orgao: "SES", sprint: "XVIA\\Sprint 6" });
  const url = new URL(enderecoDoDestino("/projeto-xvia", base, { nivel: "detalhe", aba: "entregas", acao: "replanejar" }), "http://localhost");
  assert.deepEqual(lerNavegacao(url.searchParams), { nivel: "detalhe", aba: "entregas" });
  for (const [k, v] of base) assert.equal(url.searchParams.get(k), v);
  assert.equal(url.searchParams.get("acao"), "replanejar");
});

test("nova navegação remove seleção de ação sem apagar filtros globais", () => {
  const url = new URL(enderecoDoDestino("/projeto-xvia", new URLSearchParams("visao=detalhe&aba=entregas&acao=risco&orgao=SES"), { nivel: "gerente", aba: "cronograma", filtros: { modulo: "CMS" } }), "http://localhost");
  assert.equal(url.searchParams.has("acao"), false);
  assert.equal(url.searchParams.get("orgao"), "SES");
  assert.equal(url.searchParams.get("modulo"), "CMS");
  const limpo = new URL(enderecoSemFiltros(url.pathname, url.searchParams), url);
  assert.equal(limpo.searchParams.has("orgao"), false);
  assert.deepEqual(lerNavegacao(limpo.searchParams), { nivel: "gerente", aba: "cronograma" });
});

test("valores inválidos usam navegação válida; endereço original abre o Secretário", () => {
  assert.deepEqual(lerNavegacao(new URLSearchParams()), { nivel: "secretario", aba: "relatorio" });
  assert.deepEqual(lerNavegacao(new URLSearchParams("visao=gerente&aba=ust")), { nivel: "gerente", aba: "prioridades" });
  assert.deepEqual(lerNavegacao(new URLSearchParams("visao=invalida&aba=naoexiste")), { nivel: "secretario", aba: "relatorio" });
});
