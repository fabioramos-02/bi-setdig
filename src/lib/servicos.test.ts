import { test } from "node:test";
import assert from "node:assert/strict";
import { prazoServico, labelCategoria, resumoPrazo, resumoPublico } from "./servicos.ts";
import type { CartaRelacao } from "@/lib/data";

function carta(over: Partial<CartaRelacao>): CartaRelacao {
  return {
    titulo: "Serviço X",
    nomePopular: null,
    slug: "servico-x",
    orgao: "Órgão X",
    orgaoSigla: "OX",
    setor: null,
    categoria: "categoria-a",
    publico: null,
    publicoEspecifico: [],
    ativo: true,
    digital: false,
    online: false,
    destaque: false,
    custo: null,
    tempoTotal: null,
    tipoTempo: null,
    updatedAt: null,
    ...over,
  };
}

test("prazoServico antepõe número só em unidade temporal", () => {
  assert.equal(prazoServico(90, "Dias corridos"), "90 Dias corridos");
  assert.equal(prazoServico(15, "Dias úteis"), "15 Dias úteis");
  assert.equal(prazoServico(6, "Meses"), "6 Meses");
  assert.equal(prazoServico(1, "Acesso Imediato"), "Acesso Imediato"); // não vira "1 Acesso Imediato"
  assert.equal(prazoServico(0, "Conforme Tabela em Outras Informações"), "Conforme Tabela em Outras Informações");
  assert.equal(prazoServico(null, null), "—");
});

test("labelCategoria formata slug", () => {
  assert.equal(labelCategoria("saude-e-cuidado"), "Saude e cuidado");
  assert.equal(labelCategoria(null), "Sem categoria");
});

test("resumoPrazo bucketa por faixa e converte unidade não-dia pra dias aproximados", () => {
  const cartas: CartaRelacao[] = [
    carta({ tipoTempo: "Acesso Imediato", tempoTotal: 1 }),
    carta({ tipoTempo: "Dias corridos", tempoTotal: 20 }),
    carta({ tipoTempo: "Dias úteis", tempoTotal: 60 }),
    carta({ tipoTempo: "Meses", tempoTotal: 6 }), // 180 dias -> "Mais de 90 dias"
    carta({ tipoTempo: "Semanas", tempoTotal: 2 }), // 14 dias -> "Até 30 dias"
    carta({ tipoTempo: "Conforme Tabela em Outras Informações", tempoTotal: 0 }),
    carta({ tipoTempo: null, tempoTotal: null }),
  ];
  const r = resumoPrazo(cartas);
  const porLabel = Object.fromEntries(r.map((f) => [f.label, f.total]));
  assert.equal(porLabel["Acesso imediato"], 1);
  assert.equal(porLabel["Até 30 dias"], 2); // 20 dias + 2 semanas
  assert.equal(porLabel["31 a 90 dias"], 1); // 60 dias úteis
  assert.equal(porLabel["Mais de 90 dias"], 1); // 6 meses
  assert.equal(porLabel["Variável / conforme tabela"], 1);
  assert.equal(porLabel["Não informado"], 1);
});

test("resumoPrazo omite faixas com zero cartas", () => {
  const r = resumoPrazo([carta({ tipoTempo: "Acesso Imediato", tempoTotal: 1 })]);
  assert.deepEqual(r, [{ label: "Acesso imediato", total: 1 }]);
});

test("resumoPublico conta por público — uma carta pode contar em mais de um", () => {
  const cartas: CartaRelacao[] = [
    carta({ publicoEspecifico: ["Cidadão"] }),
    carta({ publicoEspecifico: ["Cidadão", "Empresa"] }),
    carta({ publicoEspecifico: [] }),
  ];
  const r = resumoPublico(cartas);
  const porLabel = Object.fromEntries(r.map((f) => [f.label, f.total]));
  assert.equal(porLabel["Cidadão"], 2);
  assert.equal(porLabel["Empresa"], 1);
  assert.equal(r.find((f) => f.label === "Cidadão")?.icone, "person");
});
