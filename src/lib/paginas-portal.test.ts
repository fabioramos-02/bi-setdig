import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularComposicaoPaginas, gerarResumoPaginas } from "./paginas-portal.ts";

const CLASSIFICADAS = [
  { tipo: "pagina-inicial" as const, nome: "Página inicial", visitas: 300 },
  { tipo: "servico" as const, nome: "Emitir guia de licenciamento anual", orgaoSigla: "DETRAN", categoria: "transito-e-transportes", visitas: 140 },
  { tipo: "servico" as const, nome: "Solicitar carteira de identidade", orgaoSigla: "CGP", categoria: "direitos-e-cidadania", visitas: 60 },
  { tipo: "noticia" as const, nome: "Notícia", visitas: 90 },
  { tipo: "meu-painel" as const, nome: "Meu Painel", visitas: 10 },
];
// totalListado = 600; acaoVisitas = 200 (140+60)

test("calcularComposicaoPaginas: home % sobre o total real, acao/apoio somam 100% sobre a base listada", () => {
  const c = calcularComposicaoPaginas(CLASSIFICADAS, 1000); // total real do período (não truncado)
  assert.ok(c);
  assert.equal(c!.homeVisitas, 300);
  assert.equal(c!.homePctDoTotal, 30); // 300/1000, sobre o total real
  assert.equal(c!.acaoVisitas, 200);
  assert.equal(Math.round(c!.acaoPct), 33); // 200/600, sobre a base listada (truncada)
  assert.equal(Math.round(c!.apoioPct), 67);
  assert.equal(Math.round(c!.acaoPct + c!.apoioPct), 100);
});

test("calcularComposicaoPaginas: lista vazia -> null", () => {
  assert.equal(calcularComposicaoPaginas([], 1000), null);
});

test("calcularComposicaoPaginas: total real zero nao divide por zero", () => {
  const c = calcularComposicaoPaginas(CLASSIFICADAS, 0);
  assert.equal(c?.homePctDoTotal, 0);
});

test("gerarResumoPaginas: 3 partes com nomes/numeros reais, nunca 'funil'/'conversão'/'convertido'", () => {
  const c = calcularComposicaoPaginas(CLASSIFICADAS, 1000)!;
  const servicos = CLASSIFICADAS.filter((p) => p.tipo === "servico");
  const r = gerarResumoPaginas(c, servicos, "no mês");
  assert.ok(r);
  assert.match(r!.oQueAconteceu, /30%.*300 visitas/);
  // Apoio (67%) vem antes de serviço (33%) no fraseado atual.
  assert.match(r!.oQueSignifica, /67%.*33%/);
  // Oportunidade cita o TEMA (categoria) dos serviços em destaque, não o nome cru.
  assert.match(r!.oportunidade, /tr[aâ]nsito e transportes/i);
  assert.match(r!.oportunidade, /direitos e cidadania/i);
  const textoCompleto = `${r!.oQueAconteceu} ${r!.oQueSignifica} ${r!.oportunidade}`;
  assert.doesNotMatch(textoCompleto, /funil|convers[aã]o|convertid/i);
});

test("gerarResumoPaginas: sem servico identificado, oportunidade degrada pro fallback genérico (sem tema pra citar)", () => {
  const semServico = CLASSIFICADAS.filter((p) => p.tipo !== "servico");
  const c = calcularComposicaoPaginas(semServico, 1000)!;
  const r = gerarResumoPaginas(c, [], "no mês");
  // Sem serviço identificado não há categoria pra citar — cai no fallback
  // "diversos temas" em vez de inventar um tema específico.
  assert.match(r!.oportunidade, /diversos temas/i);
});

test("gerarResumoPaginas: sem home nem acao -> null", () => {
  const c = { homeVisitas: 0, homePctDoTotal: 0, acaoVisitas: 0, acaoPct: 0, apoioPct: 0 };
  assert.equal(gerarResumoPaginas(c, [], "no mês"), null);
});
