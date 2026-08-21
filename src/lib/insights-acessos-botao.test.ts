import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  cartasComAltaConversao,
  cartasComBaixaConversao,
  destinosAgregados,
  faixaConversao,
  fraseAncoraAcessos,
  taxaMediaPonderada,
} from "./insights-acessos-botao.ts";
import type { AcessoBotaoCarta } from "./data.ts";

const carta = (over: Partial<AcessoBotaoCarta> = {}): AcessoBotaoCarta => ({
  slug: "s",
  titulo: "T",
  orgaoSigla: null,
  categoria: null,
  urlCarta: "https://x",
  views: 100,
  cliquesTotais: 30,
  taxaConversaoPct: 30,
  destinos: [{ url: "https://a", cliques: 30, pct: 100 }],
  ...over,
});

test("faixaConversao — cortes 50/20/0", () => {
  assert.equal(faixaConversao(80), "alta");
  assert.equal(faixaConversao(50), "alta");
  assert.equal(faixaConversao(49.9), "media");
  assert.equal(faixaConversao(20), "media");
  assert.equal(faixaConversao(19.9), "baixa");
  assert.equal(faixaConversao(0.1), "baixa");
  assert.equal(faixaConversao(0), "sem-dado");
});

test("taxaMediaPonderada — respeita peso por views (não média de médias)", () => {
  // Carta pequena com 100% de conversão NÃO deve puxar a média.
  const cartas = [carta({ views: 1000, cliquesTotais: 100 }), carta({ views: 10, cliquesTotais: 10 })];
  // Total: 110 cliques / 1010 views ≈ 10,89% (não 55% da média simples).
  assert.equal(taxaMediaPonderada(cartas), 10.89);
});

test("taxaMediaPonderada — vazio devolve 0 sem dividir por zero", () => {
  assert.equal(taxaMediaPonderada([]), 0);
  assert.equal(taxaMediaPonderada([carta({ views: 0, cliquesTotais: 0 })]), 0);
});

test("cartasComBaixaConversao — só considera carta com volume mínimo", () => {
  const cartas = [
    carta({ slug: "a", views: 500, cliquesTotais: 50, taxaConversaoPct: 10 }),
    carta({ slug: "b", views: 50, cliquesTotais: 5, taxaConversaoPct: 10 }),
    carta({ slug: "c", views: 500, cliquesTotais: 300, taxaConversaoPct: 60 }),
  ];
  const baixa = cartasComBaixaConversao(cartas, 100);
  assert.equal(baixa.length, 1);
  assert.equal(baixa[0].slug, "a");
});

test("cartasComAltaConversao — ordena por cliques absolutos", () => {
  const cartas = [
    carta({ slug: "pouco", views: 100, cliquesTotais: 80, taxaConversaoPct: 80 }),
    carta({ slug: "muito", views: 1000, cliquesTotais: 600, taxaConversaoPct: 60 }),
  ];
  const alta = cartasComAltaConversao(cartas, 20);
  assert.equal(alta[0].slug, "muito");
  assert.equal(alta[1].slug, "pouco");
});

test("destinosAgregados — soma URL igual entre cartas, ignora 'Outros destinos'", () => {
  const cartas = [
    carta({
      destinos: [
        { url: "https://meudetran.ms.gov.br/", cliques: 80, pct: 80 },
        { url: "Outros destinos", cliques: 20, pct: 20 },
      ],
    }),
    carta({
      destinos: [{ url: "https://meudetran.ms.gov.br/", cliques: 100, pct: 100 }],
    }),
  ];
  const agregado = destinosAgregados(cartas, 5);
  assert.equal(agregado.length, 1);
  assert.equal(agregado[0].url, "https://meudetran.ms.gov.br/");
  assert.equal(agregado[0].cliques, 180);
});

test("fraseAncoraAcessos — sem dado degrada honestamente", () => {
  const r = fraseAncoraAcessos([]);
  assert.equal(r.semDado, true);
  assert.match(r.fraseAncora, /Ainda não há dado suficiente/);
});

test("fraseAncoraAcessos — inclui números formatados pt-BR", () => {
  const r = fraseAncoraAcessos([carta({ views: 1000, cliquesTotais: 200, taxaConversaoPct: 20 })]);
  assert.equal(r.semDado, false);
  assert.match(r.fraseAncora, /1\.000 visitas/);
  assert.match(r.fraseAncora, /200 cliques/);
});
