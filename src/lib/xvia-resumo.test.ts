import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { prepararResumoXvia, type EntradaResumoXvia } from "./xvia-resumo.ts";
import { andamentoEntregas, consumoContrato, filtrarItens, pendencias, prazoProjeto, soXvia, type Filtros } from "./tfs.ts";

const ler = (nome: string) => JSON.parse(fs.readFileSync(`datasets/tfs/v1/${nome}.json`, "utf8"));
const base: EntradaResumoXvia = { itens: ler("itens"), sprints: ler("sprints"), contrato: ler("contrato"), etp: ler("etp-ust"), financeiro: ler("financeiro"), hoje: "2026-11-11", recorte: false };

test("apresentação conserva os indicadores e componentes da conta nos filtros publicados", () => {
  for (const f of [{}, { modulo: "CMS" }, { orgao: "SES" }, { frente: "SGD" }, { frente: "Não identificado" }, { sprint: "XVIA\\Sprint 6" }]) {
    const filtros: Filtros = { modulo: "", frente: "", orgao: "", sprint: "", ...f };
    const itens = filtrarItens(base.itens, filtros);
    const r = prepararResumoXvia({ ...base, itens, recorte: Object.values(filtros).some(Boolean) });
    const c = consumoContrato(itens, base.etp, base.contrato, prazoProjeto(base.contrato, base.sprints, base.hoje).mesDoContrato);
    assert.equal(r.consumo.ustExecutada, c.ustExecutada);
    assert.equal(r.consumo.valorExecutado, c.valorExecutado);
    assert.equal(r.andamento.planejadas, andamentoEntregas(soXvia(itens)).planejadas);
    assert.deepEqual(r.atencao.map((i) => i.id), pendencias(soXvia(itens)).filter((i) => i.coluna === "Aguardando decisão").slice(0, 3).map((i) => i.id));
  }
});

test("ausência de base X-VIA não recebe julgamento de atraso nem alerta de zero de zero", () => {
  for (const itens of [[], base.itens.filter((i) => i.frente === "SGD"), base.itens.filter((i) => i.frente === "Não identificado")]) {
    const r = prepararResumoXvia({ ...base, itens, recorte: true });
    assert.equal(r.temEntregas, false);
    assert.equal(r.veredito.tom, "neutro");
    assert.doesNotMatch(r.veredito.frase, /atrasad|nada parado|no ritmo|0 de 0/i);
    assert.ok(r.veredito.sinais.every((s) => s.tom === "neutro" && s.barras === undefined));
  }
});

test("zero com tarefas registradas continua sendo zero; fontes ausentes não viram pagamento zero", () => {
  const itens = base.itens.filter((i) => i.frente === "X-VIA" && i.tipo === "Task" && i.estado !== "Done" && i.estado !== "Removed");
  const r = prepararResumoXvia({ ...base, itens, recorte: true });
  assert.equal(r.temTarefas, true);
  assert.equal(r.consumo.ustExecutada, 0);
  assert.equal(r.cadeia.valorPago.valor, null);
  assert.ok(r.passos.length <= 3);
});
