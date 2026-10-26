import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  entregasDaSprint,
  entregasDoMes,
  AREA_UST,
  execucaoXvia,
  filtrarItens,
  FILTROS_VAZIOS,
  ustEtp,
  pendencias,
  porModulo,
  prazoProjeto,
  resumoEntregas,
  stakeholdersDoProjeto,
  type EtpUst,
  type TfsContrato,
  type TfsItem,
  type TfsSprint,
} from "./tfs.ts";

const item = (over: Partial<TfsItem>): TfsItem => ({
  id: 1, tipo: "Product Backlog Item", titulo: "x", estado: "New", coluna: "A fazer",
  area: "XVIA", frente: "X-VIA", sprint: "XVIA\\Sprint 5", epicoId: 10, epico: "CMS",
  featureId: 20, feature: "f", pbiId: null, orgao: null, tags: [], tipoEntrega: null,
  pendencia: false, criadoEm: null, alteradoEm: null, fechadoEm: null, prazo: null,
  diasSemAtualizar: null, atividadeUst: null, complexidadeUst: null, ust: null, dataExecucao: null,
  codigoCatalogo: null,
  ...over,
});

const sprints: TfsSprint[] = [
  { sprint: "XVIA\\Sprint 4", nome: "Sprint 4", inicio: "2026-09-29", fim: "2026-10-13", situacao: "encerrada" },
  { sprint: "XVIA\\Sprint 5", nome: "Sprint 5", inicio: "2026-10-14", fim: "2026-10-27", situacao: "atual" },
];

const contrato = (over: Partial<TfsContrato> = {}): TfsContrato => ({
  contrato: "X-VIA", inicio: "2026-07-27", fim: null, ustTotalTr: null, valorUst: null,
  previsaoPorModulo: [], ...over,
});

test("prazoProjeto: sem fim no TR usa a última sprint e marca estimado", () => {
  const p = prazoProjeto(contrato(), sprints, "2026-10-26");
  assert.equal(p.fim, "2026-10-27");
  assert.equal(p.fimEstimado, true);
  assert.equal(p.diasRestantes, 1);
  assert.equal(p.sprintAtual?.nome, "Sprint 5");
});

test("prazoProjeto: fim do TR vence a sprint", () => {
  const p = prazoProjeto(contrato({ fim: "2027-07-27" }), sprints, "2026-10-26");
  assert.equal(p.fimEstimado, false);
  assert.ok(p.pctDecorrido > 0 && p.pctDecorrido < 50);
});

test("resumoEntregas: conta só PBI/Bug e Em Produção pela coluna", () => {
  const r = resumoEntregas([
    item({ coluna: "Em Produção", estado: "Done" }),
    item({ tipo: "Bug", pendencia: true }),
    item({ tipo: "Task" }),
    item({ estado: "Removed" }),
  ]);
  assert.deepEqual(r, { total: 2, emProducao: 1, pctProducao: 50, pendencias: 1, abertas: 1 });
});

test("porModulo: separa X-VIA e SGD e conta tipo de entrega", () => {
  const [cms] = porModulo([
    item({ frente: "SGD", tipoEntrega: "Negócio" }),
    item({ tipoEntrega: "Desenvolvimento X-VIA", coluna: "Em Produção" }),
  ]);
  assert.equal(cms.xvia, 1);
  assert.equal(cms.sgd, 1);
  assert.equal(cms.emProducao, 1);
  assert.equal(cms.porTipo["Negócio"], 1);
});

test("pendencias: mais paradas primeiro", () => {
  const p = pendencias([
    item({ id: 1, pendencia: true, diasSemAtualizar: 2 }),
    item({ id: 2, pendencia: true, diasSemAtualizar: 30 }),
    item({ id: 3 }),
  ]);
  assert.deepEqual(p.map((i) => i.id), [2, 1]);
});

test("entregasDaSprint e entregasDoMes", () => {
  const itens = [
    item({ id: 1, coluna: "Impedido" }),
    item({ id: 2, sprint: "XVIA\\Sprint 4", estado: "Done", fechadoEm: "2026-10-10" }),
    item({ id: 3, estado: "Done", fechadoEm: "2026-09-30" }),
  ];
  const s = entregasDaSprint(itens, sprints[1]);
  assert.deepEqual(s.itens.map((i) => i.id), [1, 3]);
  assert.deepEqual(entregasDoMes(itens, "2026-10").map((g) => g.sprint), ["XVIA\\Sprint 4"]);
});

const etp = JSON.parse(fs.readFileSync("datasets/tfs/v1/etp-ust.json", "utf-8")) as EtpUst;

test("ustEtp: previsto por código fecha o total do ETP (23.356)", () => {
  const tabela = ustEtp(etp);
  const soma = [...tabela.values()].reduce((s, c) => s + c.previsto, 0);
  const semCodigo = etp.estruturais.filter((l) => !l.codigo).reduce((s, l) => s + l.ust * l.ocorrencia, 0);
  assert.equal(soma + semCodigo, etp.totalEtp);
  // DEV.13: 3×3 em 36 serviços (324) + estrutural 3×36 (108)
  assert.equal(tabela.get("DEV.13")?.previsto, 432);
  // TES.07: unitária vem do perfil (2), não da linha estrutural de documentação (5)
  assert.equal(tabela.get("TES.07")?.ustUnitaria, 2);
});

test("execucaoXvia: só área Customização UST; sem código/faixa/fora do ETP ficam a classificar", () => {
  const ust = AREA_UST;
  const f = execucaoXvia([
    item({ tipo: "Task", area: ust, codigoCatalogo: "DEV.13", estado: "Done" }),
    item({ tipo: "Task", area: ust, codigoCatalogo: "DEV.13" }),
    item({ tipo: "Task", area: ust, codigoCatalogo: "NEG.03/04/05" }),
    item({ tipo: "Task", area: ust, codigoCatalogo: "NEG.19" }),
    item({ tipo: "Task", area: ust }),
    item({ tipo: "Task", area: "XVIA\\SGD", codigoCatalogo: "DEV.13", estado: "Done" }),
  ], etp, contrato({ ustTotalTr: 23356, valorUst: 10 }));
  assert.equal(f.tarefas, 5);
  assert.equal(f.ustExecutada, 3);
  assert.equal(f.ustLancada, 6);
  assert.equal(f.valorExecutado, 30);
  assert.deepEqual(f.contagemAClassificar, { "sem código": 1, "faixa a definir": 1, "fora do ETP": 1 });
  const dev13 = f.porCodigo.find((l) => l.codigo === "DEV.13");
  assert.equal(dev13?.saldo, 432 - 6);
  assert.ok(f.porCodigo.some((l) => l.codigo === "IA.16" && l.tarefas === 0));
});

test("filtrarItens: combina módulo, frente, órgão e sprint", () => {
  const itens = [item({ id: 1, epico: "CMS", frente: "SGD" }), item({ id: 2, epico: "CMS" }), item({ id: 3, epico: "Portal" })];
  assert.equal(filtrarItens(itens, FILTROS_VAZIOS).length, 3);
  assert.deepEqual(filtrarItens(itens, { ...FILTROS_VAZIOS, modulo: "CMS", frente: "X-VIA" }).map((i) => i.id), [2]);
});

test("stakeholdersDoProjeto: só órgão com item ou papel", () => {
  const s = stakeholdersDoProjeto(
    [
      { sigla: "SES", nome: "Saúde", secretario: null, site: null, pontoFocal: null, contato: null, papel: null, modulos: [] },
      { sigla: "AEM", nome: "Metrologia", secretario: null, site: null, pontoFocal: null, contato: null, papel: null, modulos: [] },
      { sigla: "SEC", nome: "Cidadania", secretario: null, site: null, pontoFocal: "Ana", contato: null, papel: "piloto", modulos: [] },
    ],
    [item({ orgao: "SES", epico: "Serviços" })],
  );
  assert.deepEqual(s.map((x) => x.sigla), ["SES", "SEC"]);
  assert.deepEqual(s[0].modulosNoTfs, ["Serviços"]);
});
