import { test } from "node:test";
import assert from "node:assert/strict";
import { topServicosLive } from "./perfil-live.ts";
import type { CartaRelacao } from "../data.ts";

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
  carta({ titulo: "Emitir CRLV", slug: "emitir-crlv13", categoria: "transito-e-transportes", orgaoSigla: "DETRAN" }),
];

test("topServicosLive: 2 URLs cruas da mesma carta (categorias diferentes) viram 1 linha só, visitas somadas", () => {
  const rows = [
    { url: "/transito-e-transportes/emitir-crlv13", nb_visits: 100 },
    { url: "/administracao-publica/emitir-crlv13", nb_visits: 30 },
  ];
  const linhas = topServicosLive(rows, inventario);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].servico, "Emitir CRLV");
  assert.equal(linhas[0].visitas, 130);
});
