import { test } from "node:test";
import assert from "node:assert/strict";
import { diasDesde, lerQuadroTime, perguntaGrafico, rotuloCard, type WidgetPainel } from "./tfs-painel.ts";

// Cards e gráficos como estão no dashboard do time em 2026-11-03.
const DASHBOARD: WidgetPainel[] = [
  { titulo: "REUNIÃO", tipo: "numero", total: 182 },
  { titulo: "EPIC", tipo: "numero", total: 15 },
  { titulo: "PBI", tipo: "numero", total: 490 },
  { titulo: "DESPRIORIZADO", tipo: "numero", total: 7 },
  { titulo: "BUG", tipo: "numero", total: 29 },
  { titulo: "AGUARDANDO DECISÃO", tipo: "numero", total: 10 },
  { titulo: "IMPEDIDO", tipo: "numero", total: 7 },
  { titulo: "EM DESENVOLVIMENTO", tipo: "numero", total: 12 },
  { titulo: "TASK's ' sem UST's", tipo: "grafico", total: 300, grupos: [{ rotulo: "Sprint 7", qtd: 120 }] },
];

test("lerQuadroTime: separa ação, andamento e tamanho pelo nome do card", () => {
  const q = lerQuadroTime(DASHBOARD);
  assert.deepEqual(q.acao.map((c) => c.rotulo), ["Bugs", "Aguardando decisão", "Impedidos"]);
  assert.deepEqual(q.andamento.map((c) => c.rotulo), ["Despriorizados", "Em desenvolvimento"]);
  assert.deepEqual(q.tamanho.map((c) => c.rotulo), ["Reunião", "Épicos", "Itens do backlog (PBI)"]);
  assert.equal(q.anchor, "46 itens pedem ação do time agora: 29 bugs, 10 aguardando decisão, 7 impedidos.");
  assert.equal(q.graficos[0].pergunta, "Quais sprints têm mais tarefas sem UST lançada?");
});

test("lerQuadroTime: sem card de ação, sem frase-âncora (nunca inventa)", () => {
  assert.equal(lerQuadroTime([{ titulo: "EPIC", tipo: "numero", total: 1 }]).anchor, null);
});

test("rótulos: nome desconhecido vira caixa normal; nome truncado do dashboard ainda casa", () => {
  assert.equal(rotuloCard("APLICATIVO"), "Aplicativo");
  assert.equal(rotuloCard("AGUAR... DECISÃO"), "Aguardando decisão");
  assert.equal(perguntaGrafico("PACOTES DE ENTREGA"), "Em que etapa estão os pacotes de entrega?");
  assert.equal(perguntaGrafico("NOVO GRÁFICO"), "Novo gráfico");
});

test("diasDesde: dias inteiros desde a extração", () => {
  assert.equal(diasDesde("2026-11-01T06:00:00Z", new Date("2026-11-03T12:00:00Z")), 2);
});
