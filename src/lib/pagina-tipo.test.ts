import { test } from "node:test";
import assert from "node:assert/strict";
import { construirContexto, classificarPagina, agruparPaginasClassificadas } from "./pagina-tipo.ts";
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
  carta({ titulo: "IPVA - consulta de débito", slug: "ipva-consulta-de-debito54", categoria: "financas-e-impostos", orgaoSigla: "SEFAZ MS", orgao: "Secretaria de Estado de Fazenda de Mato Grosso do Sul" }),
  carta({ titulo: "Emitir guia de licenciamento anual", slug: "emitir-guia-de-licenciamento-anual100", categoria: "transito-e-transportes", orgaoSigla: "DETRAN", orgao: "Departamento Estadual de Trânsito de Mato Grosso do Sul" }),
  carta({ titulo: "Carta Inativa", slug: "inativa9", categoria: "transito-e-transportes", orgaoSigla: "DETRAN", ativo: false }),
];

test("home (com e sem host) -> pagina-inicial", () => {
  const ctx = construirContexto(inventario);
  assert.equal(classificarPagina("http://ms.gov.br/", ctx).tipo, "pagina-inicial");
  assert.equal(classificarPagina("https://www.ms.gov.br/", ctx).tipo, "pagina-inicial");
});

test("carta real casada pelo slug -> nome oficial + órgão", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/financas-e-impostos/ipva-consulta-de-debito54/", ctx);
  assert.equal(c.tipo, "servico");
  assert.equal(c.nome, "IPVA - consulta de débito");
  assert.equal(c.orgaoSigla, "SEFAZ MS");
});

test("carta casa mesmo com categoria divergente da do inventário (slug é a chave)", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/administracao-publica/ipva-consulta-de-debito54", ctx);
  assert.equal(c.tipo, "servico");
  assert.equal(c.nome, "IPVA - consulta de débito");
});

test("carta inativa não casa", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/transito-e-transportes/inativa9", ctx);
  assert.notEqual(c.tipo, "servico");
});

test("página de órgão -> sigla via prefixo normalizado (espaço na sigla, hífen na URL)", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina(
    "https://www.ms.gov.br/orgao/sefaz-mssecretaria-de-estado-de-fazenda-de-mato-grosso-do-sul87/servicos",
    ctx,
  );
  assert.equal(c.tipo, "orgao");
  assert.equal(c.nome, "Serviços do Órgão SEFAZ MS");
});

test("órgão desconhecido -> tipo orgao sem sigla, não quebra", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/orgao/desconhecido999/servicos", ctx);
  assert.equal(c.tipo, "orgao");
  assert.equal(c.orgaoSigla, undefined);
});

test("workspace -> Meu Painel", () => {
  const ctx = construirContexto(inventario);
  assert.equal(classificarPagina("https://www.ms.gov.br/workspace/minha-area/meus-sistemas", ctx).nome, "Meu Painel");
});

test("noticias -> Notícia", () => {
  const ctx = construirContexto(inventario);
  assert.equal(classificarPagina("https://www.ms.gov.br/noticias/algum-titulo", ctx).tipo, "noticia");
});

test("busca (path real sem querystring: /buscar/q=termo) -> Busca no portal", () => {
  const ctx = construirContexto(inventario);
  assert.equal(classificarPagina("https://www.ms.gov.br/buscar/q=ipva", ctx).tipo, "busca");
});

test("categoria só (1 segmento) -> lista de categoria em linguagem cidadã", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/transito-e-transportes", ctx);
  assert.equal(c.tipo, "lista-categoria");
  assert.match(c.nome, /Trânsito e Transportes/);
});

test("url desconhecida (2+ segmentos, não casa nada) -> outro, sem quebrar", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/categoria-nova/slug-nunca-visto123", ctx);
  assert.equal(c.tipo, "outro");
  assert.equal(c.nome, "/categoria-nova/slug-nunca-visto123");
});

test("querystring e caixa alta não quebram o match", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/Financas-E-Impostos/Ipva-Consulta-De-Debito54?x=1", ctx);
  assert.equal(c.tipo, "servico");
});

test("/categoria/{slug} -> lista de serviços do tema (não confundir com /{slug} sozinho)", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/categoria/financas-e-impostos", ctx);
  assert.equal(c.tipo, "lista-categoria");
  assert.equal(c.nome, "Lista de serviços de Finanças e Impostos");
});

test("/categoria/administracao-publica -> Administração Pública", () => {
  const ctx = construirContexto(inventario);
  const c = classificarPagina("https://www.ms.gov.br/categoria/administracao-publica", ctx);
  assert.equal(c.nome, "Lista de serviços de Administração Pública");
});

test("bucket de agregação do Matomo ' - Others' -> honesto, sem path cru", () => {
  const ctx = construirContexto(inventario);
  const c1 = classificarPagina("/financas-e-impostos/ - Others", ctx);
  assert.equal(c1.tipo, "lista-categoria");
  assert.equal(c1.nome, "Outras páginas de Finanças e Impostos");
  const c2 = classificarPagina("/noticias/ - Others", ctx);
  // "noticias" já tem regra própria (prioridade sobre o bucket Others).
  assert.equal(c2.tipo, "noticia");
});

test("variações do sufixo Others (case, hífen, espaço) casam", () => {
  const ctx = construirContexto(inventario);
  assert.equal(classificarPagina("/financas-e-impostos/Others", ctx).nome, "Outras páginas de Finanças e Impostos");
  assert.equal(classificarPagina("/financas-e-impostos/-Others", ctx).nome, "Outras páginas de Finanças e Impostos");
  assert.equal(classificarPagina("/financas-e-impostos/ - others", ctx).nome, "Outras páginas de Finanças e Impostos");
});

test("agruparPaginasClassificadas: 2 URLs cruas da MESMA carta (categorias diferentes) viram 1 linha só, visitas somadas", () => {
  const ctx = construirContexto(inventario);
  const linhas = agruparPaginasClassificadas(
    [
      { url: "/financas-e-impostos/ipva-consulta-de-debito54", visitas: 100 },
      { url: "/administracao-publica/ipva-consulta-de-debito54", visitas: 30 },
    ],
    ctx,
  );
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].nome, "IPVA - consulta de débito");
  assert.equal(linhas[0].visitas, 130);
});

test("agruparPaginasClassificadas: entidades diferentes não se misturam, ordena desc", () => {
  const ctx = construirContexto(inventario);
  const linhas = agruparPaginasClassificadas(
    [
      { url: "/transito-e-transportes/emitir-guia-de-licenciamento-anual100", visitas: 10 },
      { url: "/", visitas: 50 },
    ],
    ctx,
  );
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].nome, "Página inicial");
  assert.equal(linhas[1].nome, "Emitir guia de licenciamento anual");
});
