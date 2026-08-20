import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fraseFaixaMaior,
  pctSemInformacaoNascimento,
  pontosAtencao,
  saudeAtivacao,
  situacaoGeral,
  tituloAdocaoGovBrPorFaixa,
} from "./insights-contas.ts";
import type {
  ContaPorFaixaEtaria,
  ContasResumo,
  FaixaAcesso,
  FaixaAcessoPorTipo,
} from "./data.ts";

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

const FAIXAS_ACESSO_TIPICAS: FaixaAcesso[] = [
  { faixa: "Nos últimos 6 meses", quantidade: 25000, percentPct: 25.0 },
  { faixa: "Entre 6 meses e 2 anos", quantidade: 15000, percentPct: 15.0 },
  { faixa: "Entre 2 e 4 anos", quantidade: 12000, percentPct: 12.0 },
  { faixa: "Mais de 4 anos", quantidade: 8000, percentPct: 8.0 },
  { faixa: "Uma vez apenas", quantidade: 40000, percentPct: 40.0 },
];

const FAIXAS_ACESSO_ENGAJADO: FaixaAcesso[] = [
  { faixa: "Nos últimos 6 meses", quantidade: 50000, percentPct: 50.0 },
  { faixa: "Entre 6 meses e 2 anos", quantidade: 20000, percentPct: 20.0 },
  { faixa: "Entre 2 e 4 anos", quantidade: 10000, percentPct: 10.0 },
  { faixa: "Mais de 4 anos", quantidade: 5000, percentPct: 5.0 },
  { faixa: "Uma vez apenas", quantidade: 15000, percentPct: 15.0 },
];

const FAIXAS_IDADE_SEM_INFO: ContaPorFaixaEtaria[] = [
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
  const pct = pctSemInformacaoNascimento(FAIXAS_IDADE_SEM_INFO);
  assert.ok(pct > 90 && pct < 95, `esperado ~94%, veio ${pct}`);
});

test("situacaoGeral inclui recentes e matrículas", () => {
  const s = situacaoGeral(RESUMO_OK, FAIXAS_ACESSO_TIPICAS);
  assert.match(s, /100\.000/);
  assert.match(s, /25\.000/); // recentes 6m
  assert.match(s, /5\.000/); // matrículas
});

test("fraseFaixaMaior destaca 'Uma vez apenas' quando >=30%", () => {
  const frase = fraseFaixaMaior(FAIXAS_ACESSO_TIPICAS);
  assert.match(frase, /nunca voltaram/);
  assert.match(frase, /40\.000/);
});

test("fraseFaixaMaior destaca engajamento quando 'Nos últimos 6 meses' >=40%", () => {
  const frase = fraseFaixaMaior(FAIXAS_ACESSO_ENGAJADO);
  assert.match(frase, /voltaram/);
  assert.match(frase, /50/);
});

test("fraseFaixaMaior lida com lista vazia", () => {
  assert.equal(fraseFaixaMaior([]), "Sem contas cadastradas para analisar.");
});

test("pontosAtencao dispara alerta com 'Uma vez apenas' > 30%", () => {
  const pts = pontosAtencao(RESUMO_OK, FAIXAS_ACESSO_TIPICAS, []);
  const uma = pts.find((p) => p.texto.includes("nunca voltaram"));
  assert.ok(uma);
  assert.equal(uma?.severidade, "alerta");
});

test("pontosAtencao positivo quando >=25% nos últimos 6 meses", () => {
  const pts = pontosAtencao(RESUMO_OK, FAIXAS_ACESSO_ENGAJADO, []);
  assert.ok(pts.some((p) => p.texto.includes("base engajada")));
});

test("tituloAdocaoGovBrPorFaixa destaca recentes quando Gov.BR cai com o tempo", () => {
  const porTipo: FaixaAcessoPorTipo[] = [
    { faixa: "Nos últimos 6 meses", govbr: 27, proprio: 73, total: 100 },
    { faixa: "Mais de 4 anos", govbr: 0, proprio: 100, total: 100 },
  ];
  assert.match(tituloAdocaoGovBrPorFaixa(porTipo), /mais recente/);
});

test("tituloAdocaoGovBrPorFaixa destaca antigas quando Gov.BR sobe com o tempo", () => {
  const porTipo: FaixaAcessoPorTipo[] = [
    { faixa: "Nos últimos 6 meses", govbr: 5, proprio: 95, total: 100 },
    { faixa: "Mais de 4 anos", govbr: 40, proprio: 60, total: 100 },
  ];
  assert.match(tituloAdocaoGovBrPorFaixa(porTipo), /não acessam há mais tempo/);
});

test("tituloAdocaoGovBrPorFaixa cai no fallback quando diferença < 5 p.p.", () => {
  const porTipo: FaixaAcessoPorTipo[] = [
    { faixa: "Nos últimos 6 meses", govbr: 20, proprio: 80, total: 100 },
    { faixa: "Mais de 4 anos", govbr: 18, proprio: 82, total: 100 },
  ];
  assert.match(tituloAdocaoGovBrPorFaixa(porTipo), /parecida/);
});

test("pontosAtencao acumula abandono (2-4a + 4a+)", () => {
  const abandonando: FaixaAcesso[] = [
    { faixa: "Nos últimos 6 meses", quantidade: 10, percentPct: 10 },
    { faixa: "Entre 6 meses e 2 anos", quantidade: 15, percentPct: 15 },
    { faixa: "Entre 2 e 4 anos", quantidade: 25, percentPct: 25 },
    { faixa: "Mais de 4 anos", quantidade: 20, percentPct: 20 },
    { faixa: "Uma vez apenas", quantidade: 30, percentPct: 30 },
  ];
  const pts = pontosAtencao(RESUMO_OK, abandonando, []);
  assert.ok(pts.some((p) => p.texto.includes("reengajamento")));
});
