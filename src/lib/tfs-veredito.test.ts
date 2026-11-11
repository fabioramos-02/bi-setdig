/** Veredito do Secretário: cada sinal compara com uma base e diz se é bom ou ruim; a conta do
 * "De onde vem?" bate com o número. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  andamentoEntregas, consumoContrato, tomDecisoes, tomEntregas, tomExecucao, vereditoExecutivo,
  type EtpUst, type TfsContrato, type TfsItem,
} from "./tfs.ts";

const item = (over: Partial<TfsItem>): TfsItem => ({
  id: 1, tipo: "Product Backlog Item", titulo: "x", estado: "New", coluna: "A fazer",
  area: "XVIA", frente: "X-VIA", sprint: "XVIA\\Sprint 5", epicoId: 10, epico: "CMS",
  featureId: 20, feature: "f", pbiId: null, orgao: null, tags: [], tipoEntrega: null,
  pendencia: false, criadoEm: null, alteradoEm: null, fechadoEm: null, prazo: null,
  diasSemAtualizar: null, atividadeUst: null, complexidadeUst: null, ust: null, dataExecucao: null,
  codigoCatalogo: null, ...over,
});
const etp: EtpUst = { totalEtp: 100, totalEstrutural: 0, perfis: [], estruturais: [{ codigo: "DOC.07", servico: "Doc", ust: 3, ocorrencia: 10 }] };
const contrato: TfsContrato = {
  contrato: "X-VIA", inicio: "2026-06-01", fim: null, ustTotalTr: 100, valorUst: 10, previsaoPorModulo: [],
  previsaoMensal: [{ mes: 1, ust: 50 }, { mes: 2, ust: 50 }],
};
const prazo = { pctDecorrido: 30, diasRestantes: 300, inicio: "2026-06-01", fim: "2027-12-01" };

test("tons: entregas pela régua do painel do TFS; execução pelo previsto; decisões pelo tempo parado", () => {
  assert.deepEqual([tomEntregas(30, 30), tomEntregas(24, 30), tomEntregas(10, 30), tomEntregas(0, 0)], ["ok", "atencao", "critico", "ok"]);
  assert.deepEqual([tomExecucao(80, 100), tomExecucao(50, 100), tomExecucao(6, 100), tomExecucao(6, null)], ["ok", "atencao", "critico", "info"]);
  assert.deepEqual([tomDecisoes([]), tomDecisoes([item({ diasSemAtualizar: 3 })]), tomDecisoes([item({ diasSemAtualizar: 31 })])], ["ok", "atencao", "critico"]);
});

test("conta do 'De onde vem?' da execução: tarefas → UST → R$ → % do previsto, e o valor por item soma o total", () => {
  const t = (id: number) => item({ id, tipo: "Task", estado: "Done", area: "XVIA\\Customização UST", codigoCatalogo: "DOC.07" });
  const c = consumoContrato([t(1), t(2)], etp, contrato, 2);
  assert.equal(c.origem.numero, "6 UST executadas");
  // toLocaleString em R$ usa espaço não separável: normaliza antes de comparar.
  assert.deepEqual(c.origem.passos?.map((s) => s.replace(/ /g, " ")), [
    "2 tarefas da X-VIA concluídas, com atividade do catálogo",
    "somam 6 UST (valor de cada atividade no catálogo da X-VIA)",
    "× R$ 10,00 por UST = R$ 60,00",
    "o TR previa 100 UST até o mês 2: executado = 6% do previsto",
  ]);
  assert.equal(c.origem.itens!.reduce((s, i) => s + (c.origem.valor!.de(i) ?? 0), 0), c.ustExecutada);
});

test("veredito: frase com os três tons; recorte não compara com o contrato; sem pagamento é dito", () => {
  const entregas = [item({ id: 1, coluna: "Em Produção" }), item({ id: 2 }), item({ id: 3 })];
  const t = item({ id: 9, tipo: "Task", estado: "Done", area: "XVIA\\Customização UST", codigoCatalogo: "DOC.07" });
  const consumo = consumoContrato([t], etp, contrato, 2);
  const paradas = [item({ id: 2, coluna: "Aguardando decisão", pendencia: true, diasSemAtualizar: 2 })];
  const v = vereditoExecutivo({ prazo, andamento: andamentoEntregas(entregas), consumo, paradas, atrasadas: [], recorte: false, semPagamento: true });
  assert.deepEqual(v.sinais.map((s) => s.tom), ["ok", "critico", "atencao"]);
  assert.equal(v.tom, "critico");
  assert.match(v.frase, /^Entregas no ritmo do prazo; execução do contrato bem abaixo do previsto \(3%\); 1 entrega espera decisão\. Nenhum pagamento registrado ainda\.$/);
  const r = vereditoExecutivo({ prazo, andamento: andamentoEntregas(entregas), consumo, paradas: [], atrasadas: [], recorte: true, semPagamento: false });
  assert.equal(r.sinais[1].tom, "info");
  assert.match(r.sinais[1].principal, /neste recorte/);
  assert.equal(r.sinais[1].barras, undefined);
  assert.match(r.frase, /neste recorte; nenhuma entrega parada\.$/);
});
