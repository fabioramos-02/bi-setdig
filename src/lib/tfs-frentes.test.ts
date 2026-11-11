/** Separação X-VIA × SGD (ADR-017) e regras do contrato. Impede que a SGD, o que não
 * tem frente identificada ou um PBI contaminem UST, faturamento, pagamento e entregas da X-VIA. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AREA_UST,
  andamentoEntregas,
  cadeiaFinanceira,
  consumoContrato,
  consumoPorOrgao,
  executadoPorMes,
  execucaoXvia,
  prazoProjeto,
  qualidadeDados,
  soXvia,
  type EtpUst,
  type Financeiro,
  type TfsContrato,
  type TfsItem,
} from "./tfs.ts";

const item = (over: Partial<TfsItem>): TfsItem => ({
  id: 1, tipo: "Product Backlog Item", titulo: "x", estado: "New", coluna: "A fazer",
  area: "XVIA", frente: "X-VIA", sprint: "XVIA\\Sprint 5", epicoId: 10, epico: "CMS",
  featureId: 20, feature: "f", pbiId: null, orgao: null, tags: [], tipoEntrega: null,
  pendencia: false, criadoEm: null, alteradoEm: null, fechadoEm: null, prazo: null,
  diasSemAtualizar: null, atividadeUst: null, complexidadeUst: null, ust: null, dataExecucao: null,
  codigoCatalogo: null, ...over,
});
const contrato = (over: Partial<TfsContrato> = {}): TfsContrato => ({
  contrato: "X-VIA", inicio: "2026-06-01", fim: null, ustTotalTr: 100, valorUst: 10, previsaoPorModulo: [], ...over,
});
const XVIA = "004/2026 - 30524 - XVIA TECNOLOGIA LTDA";
const etpDoc: EtpUst = { totalEtp: 100, totalEstrutural: 0, perfis: [], estruturais: [{ codigo: "DOC.07", servico: "Doc", ust: 3, ocorrencia: 10 }] };
const done = { tipo: "Task", estado: "Done", codigoCatalogo: "DOC.07", orgao: "SES", fechadoEm: "2026-10-03" };
const misto = () => [
  item({ id: 1, ...done, empresa: XVIA, ust: 5 }),
  item({ id: 2, ...done, frente: "SGD", empresa: "Governo do Estado", ust: 9 }),
  item({ id: 3, ...done, frente: "Não identificado", ust: 7 }),
  // snapshot errado: frente X-VIA com contrato Governo — a trava no ponto do dinheiro barra
  item({ id: 4, ...done, empresa: "Governo do Estado", ust: 11 }),
  // só Task fatura: PBI com UST não conta
  item({ id: 5, estado: "Done", empresa: XVIA, codigoCatalogo: "DOC.07", ust: 13, orgao: "SES", coluna: "Em Produção" }),
  item({ id: 6, frente: "SGD", titulo: "[SGD] - Doc", estado: "Done", coluna: "Em Produção" }),
];

test("SGD, Não identificado e PBI nunca entram em UST, R$, consumo por órgão ou por mês da X-VIA", () => {
  const x = execucaoXvia(misto(), etpDoc, contrato());
  assert.deepEqual([x.tarefas, x.ustExecutada, x.valorExecutado], [1, 5, 50]);
  assert.deepEqual(consumoPorOrgao(misto(), etpDoc, contrato()).map((o) => [o.orgao, o.ustExecutada]), [["SES", 5]]);
  assert.deepEqual(executadoPorMes(misto(), etpDoc).meses.map((m) => [m.mes, m.ust]), [["2026-10", 5]]);
  assert.equal(cadeiaFinanceira(null, { ust: x.ustExecutada, valor: x.valorExecutado }).valorConsumido.valor, 50);
});

test("entregas da X-VIA: soXvia tira SGD e Não identificado do andamento", () => {
  assert.deepEqual([andamentoEntregas(soXvia(misto())).planejadas, andamentoEntregas(soXvia(misto())).emProducao], [1, 1]);
  assert.equal(andamentoEntregas(misto()).emProducao, 2); // sem o filtro, a SGD vazaria
});

test("o contrato manda, não a pessoa: Task da X-VIA com responsável da SGD conta e vira alerta", () => {
  const itens = [item({ id: 1, ...done, empresa: XVIA, ust: 5, timeSgd: true })];
  assert.equal(execucaoXvia(itens, etpDoc, contrato()).ustExecutada, 5);
  const alerta = qualidadeDados(itens, etpDoc, contrato()).find((v) => v.rotulo.startsWith("Tarefas com contrato da X-VIA e responsável"));
  assert.deepEqual(alerta?.itens.map((i) => i.id), [1]);
});

test("total da UST = soma por órgão, inclusive código fora do ETP (bug 520 × 424)", () => {
  const itens = [
    item({ id: 1, tipo: "Task", estado: "Done", area: AREA_UST, codigoCatalogo: "DOC.07", orgao: "SES" }),
    item({ id: 2, tipo: "Task", estado: "Done", area: AREA_UST, codigoCatalogo: "NEG.19", ust: 6, orgao: "SES" }),
    item({ id: 3, tipo: "Task", estado: "Done", area: AREA_UST, codigoCatalogo: "NEG.19", ust: 6, orgao: null }),
  ];
  const total = execucaoXvia(itens, etpDoc, contrato()).ustExecutada;
  assert.equal(total, 15);
  assert.equal(consumoPorOrgao(itens, etpDoc, contrato()).reduce((s, l) => s + l.ustExecutada, 0), total);
  assert.ok(!qualidadeDados(itens, etpDoc, contrato()).some((v) => v.rotulo.startsWith("UST executada total diferente")));
});

test("contrato.json: previsão mensal fecha 23.356 e novembro/2026 é o mês 6 (mês civil)", () => {
  const real = JSON.parse(fs.readFileSync("datasets/tfs/v1/contrato.json", "utf-8")) as TfsContrato;
  const etp = JSON.parse(fs.readFileSync("datasets/tfs/v1/etp-ust.json", "utf-8")) as EtpUst;
  assert.equal(real.previsaoMensal?.reduce((s, m) => s + m.ust, 0), real.ustTotalTr);
  const p = prazoProjeto(real, [], "2026-11-10");
  assert.equal(p.mesDoContrato, 6);
  assert.equal(prazoProjeto(real, [], "2026-06-01").mesDoContrato, 1);
  assert.equal(prazoProjeto(real, [], "2029-01-01").mesDoContrato, 18);
  assert.equal(consumoContrato([], etp, real, p.mesDoContrato).previstoAteMes, 8659);
});

test("cadeiaFinanceira: sem registro = ausente; NF sem pagamento = pendente; nada é deduzido", () => {
  const vazio = cadeiaFinanceira(null, { ust: 10, valor: 100 });
  for (const k of ["ustPrevista", "ustAceita", "valorFaturado", "valorPago", "valorPendente", "valorGlosado"] as const)
    assert.deepEqual([vazio[k].valor, vazio[k].status], [null, "ausente"]);
  const fin: Financeiro = {
    ordensServico: [{ numero: "OS1", orgao: "SES", ustPrevista: 20, status: "emitida", fonte: "SEI 1" }, { numero: "OS2", orgao: "SED", ustPrevista: 5, status: "emitida", fonte: "SEI 2" }],
    medicoes: [{ id: "M1", os: "OS1", periodo: "2026-10", ustExecutada: 10, ustAceita: 8, status: "aceita", fonte: "SEI 3" }],
    notasFiscais: [{ numero: "NF1", medicoes: ["M1"], valor: 1236.88, status: "atestada", fonte: "SEI 4" }],
    pagamentos: [],
    glosas: [],
  };
  const ses = cadeiaFinanceira(fin, { ust: 10, valor: 1546.1 }, "SES");
  assert.deepEqual([ses.ustPrevista.valor, ses.ustAceita.valor, ses.valorFaturado.valor], [20, 8, 1236.88]);
  assert.deepEqual([ses.valorPago.valor, ses.valorPago.status], [null, "ausente"]);
  assert.deepEqual([ses.valorPendente.valor, ses.valorPendente.status], [1236.88, "calculado"]);
  assert.equal(cadeiaFinanceira(fin, { ust: 0, valor: 0 }, "SED").valorFaturado.valor, null);
  // pago maior que a nota: divergência à vista, nunca correção silenciosa
  const div = cadeiaFinanceira({ ...fin, pagamentos: [{ notaFiscal: "NF1", data: "2026-11-01", valor: 2000, status: "pago", fonte: "OB" }] }, { ust: 10, valor: 0 });
  assert.equal(div.valorPago.status, "divergente");
  assert.equal(div.recorte.divergencias.length, 1);
});
