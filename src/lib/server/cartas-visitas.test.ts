import { test } from "node:test";
import assert from "node:assert/strict";
import { joinVisitas, serieTemporal, urlDaCarta } from "./cartas-visitas.ts";
import type { CartaRelacao } from "@/lib/data";

function carta(over: Partial<CartaRelacao>): CartaRelacao {
  return {
    titulo: "Serviço X",
    nomePopular: null,
    slug: "servico-x100",
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

const inventario: CartaRelacao[] = [
  carta({ titulo: "Emitir CRLV", slug: "emitir-crlv13", categoria: "transito-e-transportes", orgaoSigla: "DETRAN", setor: "Habilitação" }),
  carta({ titulo: "IPVA", slug: "ipva-consulta54", categoria: "financas-e-impostos", orgaoSigla: "SEFAZ", setor: "Arrecadação" }),
  carta({ titulo: "Carta Inativa", slug: "inativa9", categoria: "transito-e-transportes", orgaoSigla: "DETRAN", ativo: false }),
  carta({ titulo: "Sem Acesso", slug: "sem-acesso1", categoria: "saude-e-cuidado", orgaoSigla: "SES" }),
];

test("casa por (categoria, slug) e soma visitas; carta sem acesso fica de fora", () => {
  const raw = [
    { url: "/transito-e-transportes/emitir-crlv13", nb_visits: 100 },
    { url: "/transito-e-transportes/emitir-crlv13?x=1", nb_visits: 50 }, // querystring soma
    { url: "/financas-e-impostos/ipva-consulta54", nb_visits: 80 },
    { url: "/noticias/algo", nb_visits: 999 }, // não é serviço
  ];
  const r = joinVisitas(raw, inventario);
  assert.equal(r.porCarta.length, 2); // CRLV + IPVA (Sem Acesso não entra)
  assert.equal(r.porCarta[0].titulo, "Emitir CRLV");
  assert.equal(r.porCarta[0].visitas, 150); // 100 + 50
  assert.equal(r.porCarta[0].url, "https://www.ms.gov.br/transito-e-transportes/emitir-crlv13");
});

test("carta inativa não casa mesmo com acesso", () => {
  const r = joinVisitas([{ url: "/transito-e-transportes/inativa9", nb_visits: 500 }], inventario);
  assert.equal(r.porCarta.length, 0);
});

test("agrega por órgão, categoria e setor", () => {
  const raw = [
    { url: "/transito-e-transportes/emitir-crlv13", nb_visits: 150 },
    { url: "/financas-e-impostos/ipva-consulta54", nb_visits: 80 },
  ];
  const r = joinVisitas(raw, inventario);
  assert.deepEqual(r.porOrgao[0], { rotulo: "DETRAN", visitas: 150 });
  assert.deepEqual(r.porCategoria[0], { rotulo: "transito-e-transportes", visitas: 150 });
  assert.deepEqual(r.porSetor[0], { rotulo: "Habilitação", visitas: 150 });
  assert.equal(r.porSetor.length, 2); // Habilitação + Arrecadação (cartas sem setor não entram)
});

test("host e caixa alta no path não quebram o match", () => {
  const r = joinVisitas([{ url: "https://www.ms.gov.br/Transito-E-Transportes/Emitir-CRLV13", nb_visits: 10 }], inventario);
  assert.equal(r.porCarta.length, 1);
  assert.equal(r.porCarta[0].visitas, 10);
});

test("urlDaCarta deriva do portal", () => {
  assert.equal(urlDaCarta({ categoria: "saude-e-cuidado", slug: "x1" }), "https://www.ms.gov.br/saude-e-cuidado/x1");
});

test("serieTemporal: 1 linha por bucket, só os nomes-alvo", () => {
  const porPeriodo = {
    "2026-02": [{ url: "/transito-e-transportes/emitir-crlv13", nb_visits: 10 }],
    "2026-01": [
      { url: "/transito-e-transportes/emitir-crlv13", nb_visits: 5 },
      { url: "/financas-e-impostos/ipva-consulta54", nb_visits: 7 },
    ],
  };
  const s = serieTemporal(porPeriodo, inventario, ["Emitir CRLV"]);
  assert.equal(s.length, 2);
  assert.equal(s[0].rotulo, "2026-01"); // ordenado
  assert.equal(s[0]["Emitir CRLV"], 5);
  assert.equal(s[1]["Emitir CRLV"], 10);
  assert.equal(s[0]["IPVA"], undefined); // não é nome-alvo
});
