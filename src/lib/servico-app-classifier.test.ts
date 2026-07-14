import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarAcessosApp } from "./servico-app-classifier.ts";
import type { Servico, ServicoCatalogo } from "./data.ts";

const catalogo: ServicoCatalogo[] = [
  { categoria: "Servidor Público", servico: "Portal do Servidor > Contracheque", tipo: "nativo", ativo: true },
  { categoria: "Saúde", servico: "Cartão do SUS Online", tipo: "nativo", ativo: true },
  { categoria: "Educação", servico: "Carteira do Estudante - CDIEMS > Consultar CDIEMS", tipo: "nativo", ativo: true },
];

test("tela == categoria vira acesso de categoria, não de serviço", () => {
  const rows: Servico[] = [{ servico: "Servidor Público", acessos: 100 }];
  const r = classificarAcessosApp(rows, catalogo);
  assert.equal(r.servicosFolha.length, 0);
  assert.equal(r.categorias[0]?.categoria, "Servidor Público");
  assert.equal(r.categorias[0]?.valor, 100);
});

test("tela == folha sem '>' no catálogo vira serviço real", () => {
  const rows: Servico[] = [{ servico: "Cartão do SUS Online", acessos: 50 }];
  const r = classificarAcessosApp(rows, catalogo);
  assert.equal(r.servicosFolha[0]?.servico, "Cartão do SUS Online");
  assert.equal(r.servicosFolha[0]?.acessos, 50);
  // soma também na categoria-mãe
  assert.equal(r.categorias.find((c) => c.categoria === "Saúde")?.valor, 50);
});

test("tela == último segmento de 'Submenu > Folha' vira serviço real", () => {
  const rows: Servico[] = [{ servico: "Contracheque", acessos: 30 }];
  const r = classificarAcessosApp(rows, catalogo);
  assert.equal(r.servicosFolha[0]?.servico, "Contracheque");
  assert.equal(r.categorias.find((c) => c.categoria === "Servidor Público")?.valor, 30);
});

test("submenu intermediário (não é categoria nem folha) cai em não identificado", () => {
  const rows: Servico[] = [{ servico: "Portal do Servidor", acessos: 20 }];
  const r = classificarAcessosApp(rows, catalogo);
  assert.equal(r.servicosFolha.length, 0);
  assert.equal(r.categorias.length, 0);
  assert.equal(r.naoIdentificadoPct, 100);
});

test("nome sem nenhum match no catálogo cai em não identificado", () => {
  const rows: Servico[] = [{ servico: "Tela Desconhecida XYZ", acessos: 10 }];
  const r = classificarAcessosApp(rows, catalogo);
  assert.equal(r.naoIdentificadoPct, 100);
});

test("mistura: categoria direta + folha + não identificado, participação soma correta", () => {
  const rows: Servico[] = [
    { servico: "Servidor Público", acessos: 100 }, // categoria direta
    { servico: "Contracheque", acessos: 30 }, // folha (Servidor Público)
    { servico: "Cartão do SUS Online", acessos: 50 }, // folha (Saúde)
    { servico: "Consultar CDIEMS", acessos: 40 }, // folha (Educação)
    { servico: "Portal do Servidor", acessos: 20 }, // não identificado
  ];
  const r = classificarAcessosApp(rows, catalogo);
  assert.equal(r.servicosFolha.length, 3);
  // categoria Servidor Público = 100 (direto) + 30 (folha Contracheque) = 130
  assert.equal(r.categorias.find((c) => c.categoria === "Servidor Público")?.valor, 130);
  const somaParticipacao = r.categorias.reduce((acc, c) => acc + (c.participacaoPct ?? 0), 0);
  assert.ok(Math.abs(somaParticipacao - 100) < 0.01);
  // total = 240; não identificado = 20 -> ~8.33%
  assert.ok(Math.abs(r.naoIdentificadoPct - (20 / 240) * 100) < 0.01);
});

test("array vazio nao quebra", () => {
  const r = classificarAcessosApp([], catalogo);
  assert.deepEqual(r.servicosFolha, []);
  assert.deepEqual(r.categorias, []);
  assert.equal(r.naoIdentificadoPct, 0);
});
