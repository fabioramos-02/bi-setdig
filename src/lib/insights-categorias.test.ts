import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categoriaLider,
  cauda,
  cobertura,
  fraseAncoraCategoria,
  pontosAtencaoCategorias,
  ranking,
  saudeConcentracao,
  topNSharePct,
  totalAcessos,
} from "./insights-categorias.ts";
import type { CategoriaResumo } from "./catalogo-app.ts";
import type { FatiaCategoria } from "../components/charts/CategoryDonut.tsx";

const CATALOGO: CategoriaResumo[] = [
  { categoria: "Servidor Público", icone: "badge", total: 9, nativo: 5, web: 4, ativo: 9 },
  { categoria: "Saúde", icone: "local_hospital", total: 11, nativo: 6, web: 5, ativo: 11 },
  { categoria: "Trânsito", icone: "directions_car", total: 12, nativo: 3, web: 9, ativo: 12 },
  { categoria: "Agronegócio", icone: "agriculture", total: 18, nativo: 0, web: 18, ativo: 18 },
  { categoria: "Mulher MS", icone: "woman", total: 8, nativo: 5, web: 3, ativo: 8 },
  { categoria: "MS.gov", icone: "public", total: 1, nativo: 0, web: 1, ativo: 1 },
  { categoria: "Nota Premiada", icone: "confirmation_number", total: 1, nativo: 0, web: 1, ativo: 1 },
];

const ACESSOS: FatiaCategoria[] = [
  { categoria: "Servidor Público", valor: 66978, participacao: 0 },
  { categoria: "Saúde", valor: 42082, participacao: 0 },
  { categoria: "Trânsito", valor: 13972, participacao: 0 },
  { categoria: "Mulher MS", valor: 100, participacao: 0 },
];

test("ranking ordena por acessos e inclui categorias sem uso", () => {
  const r = ranking(CATALOGO, ACESSOS);
  assert.equal(r.length, CATALOGO.length);
  assert.equal(r[0].categoria, "Servidor Público");
  assert.equal(r[r.length - 1].acessos, 0);
});

test("ranking calcula share sobre total de acessos", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const soma = r.reduce((a, c) => a + c.sharePct, 0);
  assert.ok(soma > 99 && soma < 101, `soma ${soma}`);
});

test("ranking com lista de acessos vazia devolve todos com share 0", () => {
  const r = ranking(CATALOGO, []);
  assert.equal(r.length, CATALOGO.length);
  assert.ok(r.every((c) => c.acessos === 0 && c.sharePct === 0));
});

test("categoriaLider retorna a de maior acesso, null se vazio", () => {
  const r = ranking(CATALOGO, ACESSOS);
  assert.equal(categoriaLider(r)?.categoria, "Servidor Público");
  assert.equal(categoriaLider(ranking(CATALOGO, [])), null);
});

test("cauda soma categorias com <5% e >0", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const c = cauda(r);
  assert.ok(c.qtd >= 1);
  assert.ok(c.sharePct >= 0 && c.sharePct < 5 * c.qtd + 0.1);
});

test("cobertura = % de categorias medíveis com acesso (exclui atalhos web)", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const pct = cobertura(r);
  // 5 medíveis (Servidor, Saúde, Trânsito, Agronegócio, Mulher MS), 4 com uso.
  // MS.gov e Nota Premiada são atalhos → excluídos.
  assert.equal(pct, 80);
});

test("soAtalhoWeb identifica categorias com só web e <= 2 serviços", () => {
  const r = ranking(CATALOGO, ACESSOS);
  assert.equal(r.find((c) => c.categoria === "MS.gov")?.soAtalhoWeb, true);
  assert.equal(r.find((c) => c.categoria === "Nota Premiada")?.soAtalhoWeb, true);
  assert.equal(r.find((c) => c.categoria === "Agronegócio")?.soAtalhoWeb, false); // 18 servicos > 2
  assert.equal(r.find((c) => c.categoria === "Saúde")?.soAtalhoWeb, false); // tem nativo
});

test("pontosAtencao inclui aviso sobre atalhos web", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const pts = pontosAtencaoCategorias(r);
  assert.ok(pts.some((p) => p.texto.includes("atalho externo")));
});

test("topNSharePct soma os N maiores", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const top3 = topNSharePct(r, 3);
  assert.ok(top3 > 99); // Servidor + Saúde + Trânsito ≈ 99.9%
});

test("fraseAncoraCategoria menciona líder e top-5", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const f = fraseAncoraCategoria(r);
  assert.match(f, /Servidor Público/);
  assert.match(f, /%/);
});

test("fraseAncoraCategoria degrada sem acessos", () => {
  const f = fraseAncoraCategoria(ranking(CATALOGO, []));
  assert.match(f, /Ainda não há acessos/);
});

test("saudeConcentracao vermelha quando top-3 > 85%", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const s = saudeConcentracao(r);
  assert.equal(s.nivel, "vermelho");
});

test("pontosAtencaoCategorias alerta líder acima de 40%", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const pts = pontosAtencaoCategorias(r);
  assert.ok(pts.some((p) => p.texto.includes("Servidor Público")));
});

test("pontosAtencaoCategorias sinaliza silenciosas", () => {
  const r = ranking(CATALOGO, ACESSOS);
  const pts = pontosAtencaoCategorias(r);
  assert.ok(pts.some((p) => p.texto.includes("nenhum acesso")));
});

test("totalAcessos soma todas as linhas", () => {
  const r = ranking(CATALOGO, ACESSOS);
  assert.equal(totalAcessos(r), 66978 + 42082 + 13972 + 100);
});
