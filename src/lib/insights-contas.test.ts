import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pctSemInformacaoNascimento,
  pontosAtencao,
  saudeAtivacao,
  situacaoGeral,
} from "./insights-contas.ts";
import type { ContaPorFaixaEtaria, ContasResumo, UsoRetencao } from "./data.ts";

const RESUMO_OK: ContasResumo = {
  contasTotal: 100000,
  contasAtivas: 92000,
  matriculas: 5000,
  taxaAtivacaoPct: 92.0,
};

const RESUMO_RUIM: ContasResumo = {
  contasTotal: 100000,
  contasAtivas: 70000,
  matriculas: 0,
  taxaAtivacaoPct: 70.0,
};

const RETENCAO: UsoRetencao = {
  nuncaAcessou: 10000,
  inativos2Anos: 40000,
  recorrentes6Meses: 22000,
  totalContas: 100000,
};

const FAIXAS_MAIORIA_SEM_INFO: ContaPorFaixaEtaria[] = [
  { faixa: "0-17", quantidade: 100 },
  { faixa: "18-24", quantidade: 200 },
  { faixa: "Não informado", quantidade: 5000 },
];

test("saudeAtivacao verde acima de 90", () => {
  assert.equal(saudeAtivacao(92).nivel, "verde");
  assert.equal(saudeAtivacao(89.99).nivel, "amarelo");
  assert.equal(saudeAtivacao(70).nivel, "vermelho");
});

test("pctSemInformacaoNascimento com faixas vazias", () => {
  assert.equal(pctSemInformacaoNascimento([]), 0);
});

test("pctSemInformacaoNascimento calcula proporção", () => {
  const pct = pctSemInformacaoNascimento(FAIXAS_MAIORIA_SEM_INFO);
  assert.ok(pct > 90 && pct < 95, `esperado ~94%, veio ${pct}`);
});

test("situacaoGeral inclui recorrentes e matrículas quando > 0", () => {
  const s = situacaoGeral(RESUMO_OK, RETENCAO);
  assert.match(s, /100\.000/);
  assert.match(s, /22\.000/);
  assert.match(s, /5\.000/);
});

test("situacaoGeral omite matrículas quando 0", () => {
  const s = situacaoGeral(RESUMO_RUIM, null);
  assert.doesNotMatch(s, /carteira funcional/);
});

test("pontosAtencao dispara alerta quando taxa < 90", () => {
  const pts = pontosAtencao(RESUMO_RUIM, RETENCAO, FAIXAS_MAIORIA_SEM_INFO);
  assert.ok(pts.some((p) => p.texto.includes("ativação")));
  assert.ok(pts.some((p) => p.texto.includes("reengajamento")));
  assert.ok(pts.some((p) => p.texto.includes("data de nascimento")));
});

test("pontosAtencao vazio quando tudo OK", () => {
  const faixasOk: ContaPorFaixaEtaria[] = [{ faixa: "18-24", quantidade: 100 }];
  const retencaoOk: UsoRetencao = { nuncaAcessou: 1, inativos2Anos: 1, recorrentes6Meses: 50, totalContas: 100 };
  const pts = pontosAtencao(RESUMO_OK, retencaoOk, faixasOk);
  assert.equal(pts.length, 0);
});
