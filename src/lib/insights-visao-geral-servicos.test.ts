import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { CartaRelacao } from "./data.ts";
import {
  contarCartasNovosNoMes,
  gerarPontosAtencao,
  mesAtualEAnterior,
  sintetizarSituacao,
} from "./insights-visao-geral-servicos.ts";

describe("sintetizarSituacao", () => {
  it("frase completa com acessos e cliques", () => {
    const s = sintetizarSituacao({
      servicosAtivos: 1200,
      totalAcessos: 350_000,
      totalCliquesBotao: 47_000,
      rotuloPeriodo: "no mês",
    });
    assert.match(s.frase, /1\.200 serviços ativos/);
    assert.match(s.frase, /350\.000 acessos/);
    assert.match(s.frase, /no mês/);
    assert.match(s.frase, /47\.000 vezes em Acessar Serviço/);
    assert.ok(s.notaSaude.length > 0);
  });

  it("omite parte de acessos quando totalAcessos é null", () => {
    const s = sintetizarSituacao({
      servicosAtivos: 100,
      totalAcessos: null,
      totalCliquesBotao: 0,
      rotuloPeriodo: "no mês",
    });
    assert.match(s.frase, /100 serviços ativos\./);
    assert.doesNotMatch(s.frase, /acessos/);
    assert.doesNotMatch(s.frase, /Acessar Serviço/);
  });

  it("omite parte de cliques quando zero", () => {
    const s = sintetizarSituacao({
      servicosAtivos: 500,
      totalAcessos: 10_000,
      totalCliquesBotao: 0,
      rotuloPeriodo: "no dia",
    });
    assert.match(s.frase, /10\.000 acessos/);
    assert.doesNotMatch(s.frase, /Acessar Serviço/);
  });
});

describe("gerarPontosAtencao", () => {
  const base = {
    concentracaoOrgaoPct: 30,
    orgaoSigla: "DETRAN",
    destinoLiderPct: 40,
    destinoLiderHost: "meudetran.ms.gov.br",
    categoriaLiderPct: 30,
    cartasNovosMesAtual: 10,
    cartasNovosMesAnterior: 10,
  };

  it("nenhum gatilho → lista vazia", () => {
    assert.deepEqual(gerarPontosAtencao(base), []);
  });

  it("concentração de oferta > 60% dispara bullet", () => {
    const p = gerarPontosAtencao({ ...base, concentracaoOrgaoPct: 65 });
    assert.equal(p.length, 1);
    assert.equal(p[0].chave, "concentracao-oferta");
    assert.match(p[0].frase, /DETRAN concentra 65%/);
  });

  it("destino líder > 70% dispara bullet", () => {
    const p = gerarPontosAtencao({ ...base, destinoLiderPct: 82 });
    assert.equal(p[0].chave, "dependencia-sistema");
    assert.match(p[0].frase, /meudetran\.ms\.gov\.br/);
    assert.match(p[0].frase, /82%/);
  });

  it("categoria líder > 50% dispara bullet", () => {
    const p = gerarPontosAtencao({ ...base, categoriaLiderPct: 55 });
    assert.equal(p[0].chave, "concentracao-categoria");
    assert.match(p[0].frase, /55%/);
  });

  it("cadastro cai (atual < 3, anterior >= 3)", () => {
    const p = gerarPontosAtencao({ ...base, cartasNovosMesAtual: 1, cartasNovosMesAnterior: 8 });
    assert.equal(p[0].chave, "cadastro-desacelerou");
    assert.match(p[0].frase, /apenas 1 novos/);
    assert.match(p[0].frase, /8 no mês anterior/);
  });

  it("cadastro não dispara sem contagem", () => {
    const p = gerarPontosAtencao({ ...base, cartasNovosMesAtual: null, cartasNovosMesAnterior: null });
    assert.deepEqual(p, []);
  });

  it("teto de 4 bullets", () => {
    const p = gerarPontosAtencao({
      concentracaoOrgaoPct: 80,
      orgaoSigla: "A",
      destinoLiderPct: 90,
      destinoLiderHost: "b.gov.br",
      categoriaLiderPct: 70,
      cartasNovosMesAtual: 0,
      cartasNovosMesAnterior: 10,
    });
    assert.equal(p.length, 4);
  });
});

describe("contarCartasNovosNoMes", () => {
  const cartaCom = (createdAt: string | null): CartaRelacao => ({
    titulo: "T",
    nomePopular: null,
    slug: "s",
    orgao: "O",
    orgaoSigla: "OS",
    categoria: null,
    publico: null,
    publicoEspecifico: [],
    ativo: true,
    digital: false,
    online: false,
    destaque: false,
    custo: null,
    tempoTotal: null,
    tipoTempo: null,
    createdAt,
    updatedAt: null,
  });

  it("null quando nenhuma carta tem createdAt", () => {
    const cartas = [cartaCom(null), cartaCom(null)];
    assert.equal(contarCartasNovosNoMes(cartas, "2026-08"), null);
  });

  it("conta cartas do mês exato", () => {
    const cartas = [
      cartaCom("2026-08-05"),
      cartaCom("2026-08-20"),
      cartaCom("2026-07-30"),
      cartaCom(null),
    ];
    assert.equal(contarCartasNovosNoMes(cartas, "2026-08"), 2);
    assert.equal(contarCartasNovosNoMes(cartas, "2026-07"), 1);
  });
});

describe("mesAtualEAnterior", () => {
  it("mês do meio do ano", () => {
    assert.deepEqual(mesAtualEAnterior("2026-08-21"), { atual: "2026-08", anterior: "2026-07" });
  });

  it("janeiro volta pra dezembro do ano anterior", () => {
    assert.deepEqual(mesAtualEAnterior("2026-01-15"), { atual: "2026-01", anterior: "2025-12" });
  });
});
