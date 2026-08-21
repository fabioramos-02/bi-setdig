import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  agregarPorOrgao,
  cartasComAltaConversao,
  cartasComBaixaConversao,
  destinosAgregados,
  faixaConversao,
  fraseAncoraAcessos,
  orgaosDisponiveis,
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

test("fraseAncoraAcessos — modo órgão personaliza texto e escopo", () => {
  const r = fraseAncoraAcessos([carta({ views: 500, cliquesTotais: 100, taxaConversaoPct: 20 })], "DETRAN");
  assert.match(r.fraseAncora, /1 cartas de DETRAN/);
  assert.match(r.comoLer, /sua carta com mais movimento/);
});

test("agregarPorOrgao — soma cliques/views, calcula taxa e destino principal por sigla", () => {
  const cartas = [
    carta({ slug: "a", orgaoSigla: "DETRAN", views: 400, cliquesTotais: 100, destinos: [{ url: "https://meudetran.ms.gov.br/", cliques: 90, pct: 90 }, { url: "https://ms.gov.br/", cliques: 10, pct: 10 }] }),
    carta({ slug: "b", orgaoSigla: "DETRAN", views: 200, cliquesTotais: 50, destinos: [{ url: "https://meudetran.ms.gov.br/", cliques: 50, pct: 100 }] }),
    carta({ slug: "c", orgaoSigla: "SEFAZ", views: 1000, cliquesTotais: 500, destinos: [{ url: "https://efazenda.ms.gov.br/", cliques: 500, pct: 100 }] }),
  ];
  const r = agregarPorOrgao(cartas);
  // Ordenado por cliques desc: SEFAZ (500) primeiro, DETRAN (150) depois.
  assert.equal(r[0].orgaoSigla, "SEFAZ");
  assert.equal(r[0].cliques, 500);
  assert.equal(r[0].taxaMediaPct, 50);
  assert.equal(r[0].destinoPrincipal, "https://efazenda.ms.gov.br/");
  assert.equal(r[1].orgaoSigla, "DETRAN");
  assert.equal(r[1].cartas, 2);
  assert.equal(r[1].cliques, 150);
  assert.equal(r[1].views, 600);
  assert.equal(r[1].taxaMediaPct, 25);
  // Destino principal do DETRAN: meudetran (90+50=140), não ms.gov.br (10).
  assert.equal(r[1].destinoPrincipal, "https://meudetran.ms.gov.br/");
  assert.equal(r[1].cliquesDestinoPrincipal, 140);
});

test("agregarPorOrgao — carta sem órgão vira 'Sem órgão' (não some do ranking)", () => {
  const r = agregarPorOrgao([carta({ orgaoSigla: null, views: 100, cliquesTotais: 20 })]);
  assert.equal(r[0].orgaoSigla, "Sem órgão");
});

test("orgaosDisponiveis — ordena alfabético e ignora null", () => {
  const cartas = [
    carta({ orgaoSigla: "SEFAZ" }),
    carta({ orgaoSigla: "DETRAN" }),
    carta({ orgaoSigla: null }),
    carta({ orgaoSigla: "DETRAN" }),
  ];
  assert.deepEqual(orgaosDisponiveis(cartas), ["DETRAN", "SEFAZ"]);
});
