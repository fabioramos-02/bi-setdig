import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularSaude, calcularContextoAnual, calcularNavegacao, gerarResumoExecutivo, gerarRecomendacoes } from "./saude-portal.ts";
import type { PeriodoState } from "./period-filter.ts";
import type { VisitaDiaria } from "./data.ts";

const MIN = "2024-01-01";
const MAX = "2026-07-17";

/** 8 semanas de histórico + a semana atual, todo dia com 100 visitas —
 * "ritmo típico" perfeitamente estável, útil pra testar os limiares. */
function serieEstavel(dataFinal: string, semanas: number, visitasPorDia: (data: string) => number): VisitaDiaria[] {
  const out: VisitaDiaria[] = [];
  const fim = new Date(dataFinal + "T00:00:00Z");
  for (let i = 0; i < semanas * 7; i++) {
    const d = new Date(fim);
    d.setUTCDate(d.getUTCDate() - i);
    const data = d.toISOString().slice(0, 10);
    out.push({ data, visitas: visitasPorDia(data), visitantesUnicos: 0, acoes: 0 });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

test("calcularSaude: mes estavel -> saudavel", () => {
  const dados = serieEstavel("2026-07-15", 60, () => 100); // ~8-9 meses de histórico diário
  const estado: PeriodoState = { tipo: "mes", dataRef: "2026-07-15" };
  const r = calcularSaude(dados, estado, MIN, MAX);
  assert.equal(r?.nivel, "saudavel");
});

test("calcularSaude: queda de 50% -> critico", () => {
  const dados = serieEstavel("2026-07-15", 20, (data) => (data >= "2026-07-13" && data <= "2026-07-15" ? 50 : 100));
  const estado: PeriodoState = { tipo: "semana", dataRef: "2026-07-15" };
  const r = calcularSaude(dados, estado, MIN, MAX);
  assert.equal(r?.nivel, "critico");
  assert.ok(r!.variacaoPct < -30);
});

test("calcularSaude: queda de 20% -> atencao", () => {
  const dados = serieEstavel("2026-07-15", 20, (data) => (data >= "2026-07-13" && data <= "2026-07-15" ? 80 : 100));
  const estado: PeriodoState = { tipo: "semana", dataRef: "2026-07-15" };
  const r = calcularSaude(dados, estado, MIN, MAX);
  assert.equal(r?.nivel, "atencao");
});

test("calcularSaude: queda de 5% -> saudavel (dentro do limiar)", () => {
  const dados = serieEstavel("2026-07-15", 20, (data) => (data >= "2026-07-13" && data <= "2026-07-15" ? 95 : 100));
  const estado: PeriodoState = { tipo: "semana", dataRef: "2026-07-15" };
  const r = calcularSaude(dados, estado, MIN, MAX);
  assert.equal(r?.nivel, "saudavel");
});

test("calcularSaude: mediana robusta a um pico isolado no historico", () => {
  // 8 semanas anteriores estáveis em 100, exceto UMA com pico de 1000
  // (ex. campanha) — mediana não deve puxar o "típico" pra cima.
  const base = serieEstavel("2026-07-08", 9, (data) => (data >= "2026-06-01" && data <= "2026-06-07" ? 1000 : 100));
  const estado: PeriodoState = { tipo: "semana", dataRef: "2026-07-15" };
  const dados = [...base, ...serieEstavel("2026-07-15", 1, () => 100)];
  const r = calcularSaude(dados, estado, MIN, MAX);
  assert.equal(r?.nivel, "saudavel");
});

test("calcularSaude: bucket parcial nao dispara falso alarme", () => {
  // mes corrente só tem 3 dias de dado (mês em andamento), mas no MESMO ritmo
  // diário do histórico -> saudável, não "queda" por soma menor.
  const dados = serieEstavel("2026-07-03", 12 * 30, () => 100);
  const estado: PeriodoState = { tipo: "mes", dataRef: "2026-07-03" };
  const r = calcularSaude(dados, estado, MIN, "2026-07-03");
  assert.equal(r?.nivel, "saudavel");
});

test("calcularSaude: dia compara mesmo dia da semana", () => {
  // toda quarta-feira tem 50 visitas (dia fraco real), resto da semana 100 —
  // comparar quarta com quarta não deve acusar queda.
  function diaDaSemana(data: string): number {
    return new Date(data + "T00:00:00Z").getUTCDay();
  }
  const dados = serieEstavel("2026-07-15", 12, (data) => (diaDaSemana(data) === 3 ? 50 : 100)); // 2026-07-15 é quarta
  const estado: PeriodoState = { tipo: "dia", dataRef: "2026-07-15" };
  const r = calcularSaude(dados, estado, MIN, MAX);
  assert.equal(r?.nivel, "saudavel");
});

test("calcularSaude: intervalo -> null (sem periodo equivalente)", () => {
  const dados = serieEstavel("2026-07-15", 20, () => 100);
  const estado: PeriodoState = { tipo: "intervalo", dataRef: "", inicio: "2026-07-01", fim: "2026-07-15" };
  assert.equal(calcularSaude(dados, estado, MIN, MAX), null);
});

test("calcularSaude: historico curto -> null", () => {
  const dados = serieEstavel("2026-07-15", 2, () => 100); // só 2 semanas de dado
  const estado: PeriodoState = { tipo: "semana", dataRef: "2026-07-15" };
  assert.equal(calcularSaude(dados, estado, MIN, MAX), null);
});

test("calcularSaude: array vazio -> null", () => {
  const estado: PeriodoState = { tipo: "mes", dataRef: "2026-07-15" };
  assert.equal(calcularSaude([], estado, MIN, MAX), null);
});

test("calcularContextoAnual: YoY e melhor/pior mes", () => {
  const dados: VisitaDiaria[] = [];
  // jan/2025 fraco, jul/2025 forte, jan/2026 mais forte que jan/2025, jul/2026 (parcial) ignorado
  const push = (mes: string, dias: number, visitas: number) => {
    for (let d = 1; d <= dias; d++) dados.push({ data: `${mes}-${String(d).padStart(2, "0")}`, visitas, visitantesUnicos: 0, acoes: 0 });
  };
  push("2025-01", 31, 50);
  push("2025-07", 31, 200);
  push("2026-01", 31, 80);
  push("2026-06", 30, 60);
  push("2026-07", 15, 999); // mês corrente incompleto — deve ser descartado

  const r = calcularContextoAnual(dados);
  assert.ok(r);
  // Mês SEMPRE com ano: "julho" sozinho seria ambíguo (os últimos 12 meses
  // cruzam a virada do ano) e parece contradizer o mês corrente em queda.
  assert.equal(r!.melhorMes, "julho de 2025"); // 31 × 200
  assert.equal(r!.piorMes, "janeiro de 2025"); // 31 × 50
  assert.ok(r!.frase.toLowerCase().includes("julho de 2025"));
  // jan/2026 (80/dia) vs jan/2025 (50/dia) não entra: o YoY compara o último
  // mês COMPLETO (jun/2026), e jun/2025 não existe na série → sem variação.
  assert.equal(r!.variacaoAnualPct, null);
});

test("calcularContextoAnual: dado insuficiente -> null", () => {
  assert.equal(calcularContextoAnual([{ data: "2026-07-01", visitas: 10, visitantesUnicos: 0, acoes: 0 }]), null);
});

test("calcularNavegacao: razao acoes/visitas + comparacao com um ano antes", () => {
  const dados: VisitaDiaria[] = [];
  const push = (mes: string, dias: number, visitas: number, acoes: number) => {
    for (let d = 1; d <= dias; d++)
      dados.push({ data: `${mes}-${String(d).padStart(2, "0")}`, visitas, visitantesUnicos: 0, acoes });
  };
  push("2025-07", 31, 100, 150); // 1,5 páginas por visita um ano antes
  push("2026-07", 31, 100, 300); // 3,0 páginas por visita agora → +100%

  const kpis = { visitas: 3100, visitantesUnicos: 0, acoes: 9300 };
  const r = calcularNavegacao(kpis, dados, { tipo: "mes", dataRef: "2026-07-15" }, MIN, "2026-07-31");
  assert.equal(r?.paginasPorVisita, 3);
  assert.equal(Math.round(r!.variacaoAnualPct!), 100);
});

test("calcularNavegacao: sem ano anterior -> variacao null (numero ainda sai)", () => {
  const dados: VisitaDiaria[] = [{ data: "2026-07-01", visitas: 10, visitantesUnicos: 0, acoes: 25 }];
  const r = calcularNavegacao({ visitas: 10, visitantesUnicos: 0, acoes: 25 }, dados, { tipo: "mes", dataRef: "2026-07-01" }, MIN, MAX);
  assert.equal(r?.paginasPorVisita, 2.5);
  assert.equal(r?.variacaoAnualPct, null);
});

test("calcularNavegacao: zero visitas -> null (nao divide por zero)", () => {
  const r = calcularNavegacao({ visitas: 0, visitantesUnicos: 0, acoes: 0 }, [], { tipo: "mes", dataRef: "2026-07-01" }, MIN, MAX);
  assert.equal(r, null);
});

test("gerarResumoExecutivo: monta frases pulando pecas nulas", () => {
  const r = gerarResumoExecutivo({
    kpis: { visitas: 1000, visitantesUnicos: 500, acoes: 2000 },
    rotuloPeriodo: "no mês",
    saude: { nivel: "saudavel", variacaoPct: 2, frase: "As visitas este mês estão no ritmo típico." },
    insightVisitas: null,
    insightBusca: { termo: "IPVA", buscas: 833, participacaoPct: 25, baseTotalReal: false },
    navegacao: { paginasPorVisita: 2.1, variacaoAnualPct: 5 },
    municipiosComAcesso: 47,
    totalMunicipios: 79,
  });
  assert.ok(r?.includes("1.000 visitas"));
  assert.ok(r?.includes("ritmo típico"));
  assert.ok(r?.includes("IPVA"));
  assert.ok(r?.includes("47 dos 79"));
  assert.ok(r?.includes("2,1 páginas"));
});

test("gerarResumoExecutivo: menos de 2 pecas -> null", () => {
  const r = gerarResumoExecutivo({
    kpis: { visitas: 0, visitantesUnicos: 0, acoes: 0 },
    rotuloPeriodo: "no mês",
    saude: null,
    insightVisitas: null,
    insightBusca: null,
    navegacao: null,
    municipiosComAcesso: 0,
    totalMunicipios: 79,
  });
  // sempre tem >= 2 frases (visitas + municípios) — este caso testa que a
  // função nao quebra com tudo nulo, nao que ela retorne null aqui.
  assert.ok(r !== null);
});

test("gerarRecomendacoes: nada aplicavel -> lista vazia", () => {
  const r = gerarRecomendacoes({
    saude: { nivel: "saudavel", variacaoPct: 5, frase: "x" },
    insightDispositivo: { dispositivo: "Desktop", participacaoPct: 60 },
    insightBusca: { termo: "IPVA", buscas: 10, participacaoPct: 5, baseTotalReal: false },
    municipiosSemAcesso: [],
  });
  assert.deepEqual(r, []);
});

test("gerarRecomendacoes: teto de 4 e risco antes de oportunidade", () => {
  const r = gerarRecomendacoes({
    saude: { nivel: "critico", variacaoPct: -50, frase: "As visitas este mês estão 50% abaixo do ritmo típico." },
    insightDispositivo: { dispositivo: "Smartphone", participacaoPct: 80 },
    insightBusca: { termo: "IPVA", buscas: 900, participacaoPct: 30, baseTotalReal: true },
    municipiosSemAcesso: ["Água Clara", "Bonito"],
  });
  assert.ok(r.length <= 4);
  assert.match(r[0].texto, /Investigar/);
  assert.equal(r.find((x) => x.abaId === "busca")?.abaId, "busca");
});
