import { test } from "node:test";
import assert from "node:assert/strict";
import { rankingMigracao, calcularInsightMigracao, MIGRACAO_NATIVOS } from "./migracao-nativos.ts";

test("MIGRACAO_NATIVOS: 37 serviços-alvo da planilha de migração", () => {
  assert.equal(MIGRACAO_NATIVOS.length, 37);
});

test("rankingMigracao: agrupa telas no alvo e casa grafia divergente do app", () => {
  const r = rankingMigracao([
    { servico: "Cartão de Vacinação", acessos: 50 },
    { servico: "Cartão de Vacinação Covid-19", acessos: 10 },
    { servico: "Cartão de Vacinação de Rotina", acessos: 15 },
    { servico: "Cartão SUS Online", acessos: 300 },
    { servico: "Pontuaçao CNH", acessos: 27 },
    { servico: "LeiaMS", acessos: 2 },
  ]);
  const por = new Map(r.itens.map((i) => [i.servico, i]));
  assert.equal(por.get("Vacinas")!.acessos, 75);
  assert.equal(por.get("Vacinas")!.origens.length, 3);
  assert.equal(por.get("Cartão do SUS")!.acessos, 300);
  assert.equal(por.get("Pontuação CNH")!.acessos, 27);
  assert.equal(por.get("Leia MS")!.acessos, 2);
  assert.equal(r.itens[0].servico, "Cartão do SUS");
});

test("rankingMigracao: tela web e tela de categoria não entram no uso nativo", () => {
  const r = rankingMigracao([
    { servico: "Agrotóxico", acessos: 1000 },
    { servico: "Saúde", acessos: 1000 },
    { servico: "Multas", acessos: 10 },
  ]);
  assert.equal(r.totalNativo, 10);
});

test("rankingMigracao: ondas por uso acumulado (80% / 95%) e sem uso fica no fim com onda null", () => {
  const r = rankingMigracao(
    [
      { servico: "A", acessos: 70 },
      { servico: "B", acessos: 20 },
      { servico: "C", acessos: 6 },
      { servico: "D", acessos: 4 },
    ],
    [
      { servico: "A", categoria: "x", telas: ["A"] },
      { servico: "B", categoria: "x", telas: ["B"] },
      { servico: "C", categoria: "x", telas: ["C"] },
      { servico: "D", categoria: "x", telas: ["D"] },
      { servico: "E", categoria: "x", telas: ["E"] },
    ],
  );
  // A (0→70) e B (70→90, cruza 80) = 1ª; C (90→96, cruza 95) = 2ª; D = 3ª.
  assert.deepEqual(r.itens.map((i) => i.onda), [1, 1, 2, 3, null]);
  assert.equal(r.itens[4].servico, "E");
  assert.equal(Math.round(r.itens[3].acumuladoPct), 100);
});

test("calcularInsightMigracao: resume ondas e lista quem não teve uso", () => {
  const ins = calcularInsightMigracao(rankingMigracao([{ servico: "Contracheque", acessos: 100 }]));
  assert.equal(ins?.lider, "Portal do Servidor > Contracheque");
  assert.equal(ins?.qtdOnda1, 1);
  assert.equal(ins?.semUso.length, 34);
  assert.deepEqual(ins?.usoNaoSeparado, ["TV Educativa MS", "Rádio Educativa MS"]);
  assert.equal(ins?.total, 37);
});

test("rankingMigracao: TV/Rádio sem tela própria recebem o uso da área, fora do Pareto", () => {
  const r = rankingMigracao([
    { servico: "Entretenimento", acessos: 7284 },
    { servico: "Multas", acessos: 10 },
  ]);
  const tv = r.itens.find((i) => i.servico === "TV Educativa MS")!;
  assert.deepEqual(tv.usoArea, { area: "Entretenimento", acessos: 7284 });
  assert.equal(tv.acessos, 0);
  assert.equal(tv.onda, null);
  assert.equal(r.totalNativo, 10);
});

test("calcularInsightMigracao: sem dado nenhum → null", () => {
  assert.equal(calcularInsightMigracao(rankingMigracao([])), null);
});
