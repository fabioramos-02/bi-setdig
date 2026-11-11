/** Leitura executiva do "De onde vem?" dos 3 sinais: só acrescenta campos à Origem do
 * veredito, e os grupos fecham com os itens e o número do sinal. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  andamentoEntregas, consumoContrato, nomeServico, vereditoExecutivo,
  type EtpUst, type TfsContrato, type TfsItem,
} from "./tfs.ts";
import {
  achadoModulos, achadoRitmo, andamentoPorModulo, decisoesPorMotivo, enriquecerVeredito, etapaDaEntrega, motivoPendencia,
} from "./tfs-origem.ts";

const item = (over: Partial<TfsItem>): TfsItem => ({
  id: 1, tipo: "Product Backlog Item", titulo: "x", estado: "New", coluna: "A fazer",
  area: "XVIA", frente: "X-VIA", sprint: "XVIA\\Sprint 5", epicoId: 10, epico: "CMS",
  featureId: 20, feature: "f", pbiId: null, orgao: null, tags: [], tipoEntrega: null,
  pendencia: false, criadoEm: null, alteradoEm: null, fechadoEm: null, prazo: null,
  diasSemAtualizar: null, atividadeUst: null, complexidadeUst: null, ust: null, dataExecucao: null,
  codigoCatalogo: null, ...over,
});
const prod = (id: number, over: Partial<TfsItem> = {}) => item({ id, estado: "Done", coluna: "Em Produção", ...over });
const etp: EtpUst = { totalEtp: 100, totalEstrutural: 0, perfis: [], estruturais: [{ codigo: "DOC.07", servico: "Doc", ust: 3, ocorrencia: 10 }] };
const contrato: TfsContrato = {
  contrato: "X-VIA", inicio: "2026-06-01", fim: null, ustTotalTr: 100, valorUst: 10, previsaoPorModulo: [],
  previsaoMensal: [{ mes: 1, ust: 50 }, { mes: 2, ust: 50 }],
};

test("nomeServico tira o código repetido do começo da atividade do TFS", () => {
  assert.equal(nomeServico("NEG.03 - Elaboração de Diagrama de Projeto (até 10 atividades)", "NEG.03"), "Elaboração de Diagrama de Projeto (até 10 atividades)");
  assert.equal(nomeServico("DEV.06 – Criação de Protótipo", "DEV.06"), "Criação de Protótipo");
  assert.equal(nomeServico("Sem prefixo", "DOC.07"), "Sem prefixo");
  assert.equal(nomeServico(null, "DOC.07"), "DOC.07");
});

test("andamentoPorModulo: etapas somam o total; produção vence a etiqueta de homologação", () => {
  const itens = [
    prod(1), prod(2, { epico: "Portal" }), item({ id: 3, tags: ["Em Homologação"] }),
    item({ id: 4, estado: "Committed", coluna: "Em Desenvolvimento" }), item({ id: 5 }), item({ id: 6, estado: "Removed" }),
  ];
  const r = andamentoPorModulo(itens, [itens[4]]);
  assert.equal(r.total, 5);
  assert.deepEqual(r.etapas, { producao: 2, homologacao: 1, andamento: 1, aFazer: 1 });
  const cms = r.porModulo.find((m) => m.modulo === "CMS")!;
  assert.deepEqual([cms.total, cms.emProducao, cms.pct, cms.atrasadas, cms.itens.length], [4, 1, 25, 1, 1]);
  assert.equal(etapaDaEntrega(prod(9, { tags: ["Em Homologação"] })), "producao");
});

test("achados: módulo maior e mais adiantado (5+ entregas); ritmo pela régua do sinal, sem repetir o %", () => {
  const m = (modulo: string, total: number, emProducao: number) => ({ modulo, total, emProducao, pct: Math.round((emProducao / total) * 100), atrasadas: 0, itens: [] });
  assert.equal(
    achadoModulos([m("CMS", 77, 22), m("Portal", 48, 31), m("Agente", 1, 1)]),
    "CMS, o maior módulo, tem 22 de 77 entregas em produção (29%). O mais adiantado é Portal, com 65%.",
  );
  assert.equal(achadoModulos([m("CMS", 10, 9), m("Portal", 8, 1)]), "CMS, o maior módulo, tem 9 de 10 entregas em produção (90%).");
  assert.equal(achadoRitmo(39, 30), "Com 30% do prazo já decorrido, as entregas acompanham o tempo.");
  assert.match(achadoRitmo(24, 30), /um pouco atrás/);
  assert.match(achadoRitmo(10, 30), /bem atrás/);
});

test("decisões: motivo pela coluna antes da etiqueta Dependência; achado pelo módulo que concentra", () => {
  const d = [
    item({ id: 1, coluna: "Aguardando decisão", tags: ["Dependência"], epico: "Portal", responsavel: "A" }),
    item({ id: 2, coluna: "Impedido", epico: "Portal", responsavel: null }),
    item({ id: 3, coluna: "Em Desenvolvimento", estado: "Committed", tags: ["Dependência"], responsavel: "B" }),
  ];
  assert.deepEqual(d.map(motivoPendencia), ["decisao", "impedido", "dependencia"]);
  const r = decisoesPorMotivo([...d, prod(4)], d);
  assert.deepEqual(r.porMotivo.map((m) => m.itens.length), [1, 1, 1]);
  assert.equal(r.abertas, 3);
  assert.equal(r.semResponsavel, 1);
  assert.equal(r.achado, "Portal concentra 2 das 3 (67%).");
});

test("enriquecerVeredito: destaque, barra e grupos nos 3 sinais; grupos fecham com os itens e o número", () => {
  const entregas = [prod(1), item({ id: 2, coluna: "Aguardando decisão", estado: "Committed", pendencia: true }), item({ id: 3 })];
  const t = (id: number, cod: string, ust: number) =>
    item({ id, tipo: "Task", estado: "Done", area: "XVIA\\Customização UST", codigoCatalogo: cod, ust, atividadeUst: `${cod} - Serviço ${cod}`, fechadoEm: `2026-10-0${id}` });
  const consumo = consumoContrato([t(5, "DOC.07", 3), t(6, "NEG.03", 4), t(7, "NEG.03", 4)], etp, contrato, 2);
  const paradas = [entregas[1]];
  const prazo = { pctDecorrido: 30, diasRestantes: 300, inicio: "2026-06-01", fim: "2027-12-01", mesDoContrato: 2 };
  const andamento = andamentoEntregas(entregas);
  const base = vereditoExecutivo({ prazo, andamento, consumo, paradas, atrasadas: [], recorte: false, semPagamento: true });
  const v = enriquecerVeredito(base, { itens: entregas, prazo, andamento, consumo, paradas, atrasadas: [], valorUst: 10, recorte: false });
  const [ent, exe, dec] = v.sinais.map((s) => s.origem);

  assert.equal(v.frase, base.frase); // só o "De onde vem?" muda
  assert.equal(ent.destaque?.valor, "33%");
  assert.equal(ent.barra?.marcador?.pct, 30);
  assert.equal(ent.grupos?.lista.flatMap((g) => g.itens).length, andamento.emProducao);

  assert.equal(exe.destaque?.valor.replace(/ /g, " "), "R$ 110,00");
  assert.equal(exe.grupos?.lista[0].nome, "Serviço NEG.03"); // sem o código repetido
  assert.equal(exe.grupos?.lista.flatMap((g) => g.itens).length, exe.itens?.length);
  assert.ok(!exe.passos?.some((p) => p.includes("110,00")), "o valor em destaque não se repete na conta");
  assert.match(exe.barra?.esquerda ?? "", /^11% das 100 UST previstas no TR até o mês 2$/);

  assert.equal(dec.destaque?.valor, "1");
  assert.deepEqual(dec.grupos?.lista.map((g) => g.itens.length), [1, 0, 0]);
});
