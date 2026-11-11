/** Execução mês a mês: o mês é o da Data da Execução (quando o trabalho foi feito), não o do
 * fechamento no TFS — a X-VIA fecha tarefas em lote. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execucaoMensal, executadoPorMes, mesesDoContrato, type EtpUst, type TfsContrato, type TfsItem } from "./tfs.ts";

const item = (over: Partial<TfsItem>): TfsItem => ({
  id: 1, tipo: "Task", titulo: "x", estado: "Done", coluna: null,
  area: "XVIA\\Customização UST", frente: "X-VIA", sprint: "XVIA\\Sprint 5", epicoId: 10, epico: "CMS",
  featureId: 20, feature: "f", pbiId: null, orgao: null, tags: [], tipoEntrega: null,
  pendencia: false, criadoEm: null, alteradoEm: null, fechadoEm: null, prazo: null,
  diasSemAtualizar: null, atividadeUst: null, complexidadeUst: null, ust: null, dataExecucao: null,
  codigoCatalogo: "DOC.07", ...over,
});
const etp: EtpUst = { totalEtp: 100, totalEstrutural: 0, perfis: [], estruturais: [{ codigo: "DOC.07", servico: "Doc", ust: 3, ocorrencia: 10 }] };
const contrato: TfsContrato = {
  contrato: "X-VIA", inicio: "2026-09-01", fim: null, vigenciaMeses: 18, ustTotalTr: 100, valorUst: 10, previsaoPorModulo: [],
  previsaoMensal: [{ mes: 1, ust: 10 }, { mes: 2, ust: 4 }, { mes: 3, ust: 20 }],
};

test("o mês da execução vence o do fechamento; o fechamento fica só para comparar", () => {
  const itens = [
    item({ id: 1, dataExecucao: "2026-10-05", fechadoEm: "2026-11-10" }), // fechada em lote
    item({ id: 2, dataExecucao: "2026-10-20", fechadoEm: "2026-11-10" }),
    item({ id: 3, fechadoEm: "2026-11-02" }), // sem Data da Execução: usa o fechamento
  ];
  const r = executadoPorMes(itens, etp);
  assert.deepEqual(r.meses.map((m) => [m.mes, m.ust]), [["2026-10", 6], ["2026-11", 3]]);
  assert.equal(r.porFechamento.get("2026-11"), 9);
});

test("meses do contrato com o previsto do TR; mês corrente parcial e sem tom; último fechado comparado ao previsto", () => {
  assert.deepEqual(mesesDoContrato(contrato, "2026-11-11").map((m) => [m.mes, m.n, m.previsto]), [["2026-09", 1, 10], ["2026-10", 2, 4], ["2026-11", 3, 20]]);
  const itens = [item({ id: 1, dataExecucao: "2026-10-05" }), item({ id: 2, dataExecucao: "2026-11-03" })];
  const r = execucaoMensal(itens, etp, contrato, "2026-11-11");
  assert.deepEqual([r.fechado?.mes, r.fechado?.ust, r.fechado?.pct, r.fechado?.tom], ["2026-10", 3, 75, "atencao"]);
  assert.deepEqual([r.atual?.mes, r.atual?.parcial, r.atual?.tom], ["2026-11", true, "info"]);
  assert.equal(r.origem.grupos?.lista[0].chave, "2026-11"); // mais recente primeiro
  assert.equal(r.origem.grupos?.lista.reduce((s, g) => s + g.itens.length, 0), 2);
});
