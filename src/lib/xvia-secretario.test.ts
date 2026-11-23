import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { prepararResumoXvia, type EntradaResumoXvia } from "./xvia-resumo.ts";
import { respostasSecretario } from "./xvia-secretario.ts";
import { fmtNum } from "./tfs.ts";

const ler = (nome: string) => JSON.parse(fs.readFileSync(`datasets/tfs/v1/${nome}.json`, "utf8"));
const base: EntradaResumoXvia = { itens: ler("itens"), sprints: ler("sprints"), contrato: ler("contrato"), etp: ler("etp-ust"), financeiro: ler("financeiro"), hoje: "2026-11-11", recorte: false };

test("as 5 perguntas do Secretário saem em ordem, com os números do resumo", () => {
  const r = prepararResumoXvia(base);
  const s = respostasSecretario(r);
  assert.deepEqual(s.map((x) => x.n), [1, 2, 3, 4, 5]);
  assert.ok(s[0].resposta.startsWith(`${r.andamento.pct}% das entregas`));
  assert.ok(s[1].resposta.startsWith(`${fmtNum(r.consumo.ustExecutada)} UST`));
  assert.ok(s[2].resposta.includes(`${fmtNum(r.atraso.length)} atrasada`));
  assert.ok(s[3].resposta.includes(`${fmtNum(r.decisoes.length)} aguarda`));
  for (const x of s) assert.ok(x.palavra, `pergunta ${x.n} sem palavra: a cor não fala sozinha`);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s); // vai para o TFS como JSON
});

test("sem itens da X-VIA, nada é julgado", () => {
  const r = prepararResumoXvia({ ...base, itens: [], recorte: true });
  const s = respostasSecretario(r);
  assert.ok(s.every((x) => x.tom === "neutro"));
});
