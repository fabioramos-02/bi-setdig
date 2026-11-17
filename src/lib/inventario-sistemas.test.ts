import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alcanceDosDonos,
  completudeCampos,
  filtrarCatalogo,
  inventariosDoSistema,
  panoramaInventario,
  perfilOrgao,
  pontosDeAtencao,
  pct,
  progressoCriticidade,
  rankingCompartilhados,
  rankingResponsabilidade,
  rotuloSistema,
  situacaoCriticidade,
  type DadosInventario,
  type Sistema,
} from "./inventario-sistemas.ts";

const vazio = { C1: null, C2: null, C3: null, C4: null, C5: null, C6: null, C7: null, C8: null } as Sistema["criterios"];

let seq = 0;
const sis = (orgaoResponsavel: string, orgaosQueUsam: string[] = [], extra: Partial<Sistema> = {}): Sistema => ({
  id: `sis-${++seq}`,
  nome: `Sistema ${seq}`,
  sigla: null,
  descricao: null,
  orgaoResponsavel,
  gestor: null,
  temContato: false,
  setor: null,
  operadora: null,
  origem: "Estadual",
  fonteDono: null,
  responsavelInformado: null,
  dataAvaliacao: null,
  criterios: vazio,
  criteriosRespondidos: 0,
  pontos: null,
  pct: null,
  criticidade: null,
  orgaosQueUsam,
  nOrgaosQueUsam: orgaosQueUsam.length,
  nIndicacoes: orgaosQueUsam.length,
  arquivosOrigem: [],
  ...extra,
});

const dados = (): DadosInventario => ({
  sistemas: [
    sis("SAD", ["SES", "SEC", "AGEMS"], { gestor: "Fulano", temContato: true }),
    sis("SAD", ["SES"]),
    sis("SAD"),
    sis("SES", [], { criticidade: { nivel: 4, rotulo: "Alta" }, pct: 75, criteriosRespondidos: 8 }),
    sis("SEFAZ", ["SAD", "SES"]),
    sis("A IDENTIFICAR", ["IAGRO"]),
  ],
  orgaos: [
    { sigla: "A IDENTIFICAR", enviouInventario: false, sistemasResponsavel: 1, sistemasDeOutrosQueUsa: 0, orgaosQueUsamSeus: 1 },
    { sigla: "SAD", enviouInventario: true, sistemasResponsavel: 3, sistemasDeOutrosQueUsa: 1, orgaosQueUsamSeus: 3 },
    { sigla: "SES", enviouInventario: true, sistemasResponsavel: 1, sistemasDeOutrosQueUsa: 3, orgaosQueUsamSeus: 0 },
    { sigla: "SEFAZ", enviouInventario: false, sistemasResponsavel: 1, sistemasDeOutrosQueUsa: 0, orgaosQueUsamSeus: 2 },
  ],
  indicacoes: [
    { sistemaId: "x", orgao: "SES", tipo: "outro", vezes: 2 },
    { sistemaId: "y", orgao: "SAD", tipo: "proprio", vezes: 1 },
  ],
  pendencias: [{ tipo: "Dono", item: "X", oQueFalta: null, fontes: [], sistemaId: null }],
  meta: null,
});

test("panorama: cobertura ignora o dono desconhecido e top3 soma certo", () => {
  const p = panoramaInventario(dados());
  assert.equal(p.nSistemas, 6);
  assert.equal(p.nOrgaos, 3);
  assert.equal(p.nEnviaram, 2);
  assert.deepEqual(p.naoEnviaram, ["SEFAZ"]);
  assert.equal(p.nCompartilhados, 4);
  assert.equal(p.nIndicacoesUso, 2);
  assert.equal(p.nAvaliados, 1);
  assert.equal(p.nDonoDesconhecido, 1);
  assert.deepEqual(p.top3.map((t) => t.sigla), ["SAD", "SEFAZ", "SES"]);
  assert.equal(p.pctTop3, 83);
  assert.match(p.anchor, /6 sistemas inventariados/);
});

test("ranking de responsabilidade não inclui o dono desconhecido", () => {
  assert.deepEqual(rankingResponsabilidade(dados().sistemas)[0], { sigla: "SAD", total: 3 });
  assert.ok(!rankingResponsabilidade(dados().sistemas).some((r) => r.sigla === "A IDENTIFICAR"));
});

test("perfil do órgão separa responsabilidade, uso e alcance", () => {
  const p = perfilOrgao("SES", dados());
  assert.equal(p.proprios.length, 1);
  assert.equal(p.usaDeOutros.length, 3);
  assert.deepEqual(p.dependeDe, [{ sigla: "SAD", sistemas: 2 }, { sigla: "SEFAZ", sistemas: 1 }]);
  const sad = perfilOrgao("SAD", dados());
  assert.deepEqual(sad.quemUsaSeus.map((q) => q.sigla), ["SES", "AGEMS", "SEC"]);
  assert.match(perfilOrgao("SEFAZ", dados()).frase, /não enviou inventário/);
});

test("compartilhamento: ranking e alcance dos donos", () => {
  const r = rankingCompartilhados(dados().sistemas, 2);
  assert.equal(r[0].nOrgaosQueUsam, 3);
  assert.equal(r.length, 2);
  assert.deepEqual(alcanceDosDonos(dados().sistemas)[0], { sigla: "SAD", orgaos: 3, sistemas: 2 });
});

test("criticidade: progresso, distribuição e situação", () => {
  const c = progressoCriticidade(dados().sistemas);
  assert.equal(c.avaliados, 1);
  assert.equal(c.pctAvaliados, 17);
  assert.equal(c.distribuicao.find((x) => x.nivel === 4)?.total, 1);
  assert.equal(c.maisCriticos.length, 1);
  assert.equal(situacaoCriticidade(dados().sistemas[3]), "avaliado");
  assert.equal(situacaoCriticidade(dados().sistemas[0]), "pendente");
});

test("completude e pontos de atenção", () => {
  const comp = completudeCampos(dados().sistemas);
  assert.equal(comp.find((c) => c.campo === "nome")?.pct, 100);
  assert.equal(comp.find((c) => c.campo === "orgao")?.preenchidos, 5);
  assert.equal(comp.find((c) => c.campo === "gestor")?.pct, 17);
  const pts = pontosDeAtencao(dados()).map((p) => p.titulo);
  assert.ok(pts.includes("Criticidade ainda não avaliada"));
  assert.ok(pts.includes("Sistema sem órgão responsável"));
});

test("percentual não arredonda para 100% nem 0% sem ser exato", () => {
  assert.equal(pct(207, 208), 99);
  assert.equal(pct(208, 208), 100);
  assert.equal(pct(1, 500), 1);
  assert.equal(pct(0, 10), 0);
});

test("inventários de origem: árvore órgão → arquivo → linha, dono primeiro", () => {
  const s = sis("SAD", ["SES", "AGEMS"], { arquivosOrigem: ["cortado..."] });
  const arvore = inventariosDoSistema(s, [
    { sistemaId: s.id, orgao: "SES", tipo: "outro", vezes: 2, origens: [
      { arquivo: "ses.xlsx", linha: 3, nomeComoVeio: "GCONT" },
      { arquivo: "ses.xlsx", linha: 8, nomeComoVeio: "Contratos" },
    ] },
    { sistemaId: s.id, orgao: "AGEMS", tipo: "outro", vezes: 1, origens: [{ arquivo: "agems.xlsx", linha: 1, nomeComoVeio: null }] },
    { sistemaId: s.id, orgao: "SAD", tipo: "proprio", vezes: 1, origens: [{ arquivo: "sad.xlsx", linha: 2, nomeComoVeio: null }] },
    { sistemaId: "outro", orgao: "SEC", tipo: "outro", vezes: 1 },
  ]);
  assert.deepEqual(arvore.map((a) => a.orgao), ["SAD", "AGEMS", "SES"]);
  assert.equal(arvore[2].arquivos.length, 1);
  assert.deepEqual(arvore[2].arquivos[0].linhas.map((l) => l.linha), [3, 8]);
  // sem indicações: usa a lista de arquivos da aba Inventário
  assert.equal(inventariosDoSistema(s, [])[0].arquivos[0].arquivo, "cortado...");
});

test("catálogo: filtros e rótulo", () => {
  assert.equal(filtrarCatalogo(dados().sistemas, { orgao: "SAD", uso: "compartilhado" }).length, 2);
  assert.equal(filtrarCatalogo(dados().sistemas, { situacao: "avaliado" }).length, 1);
  assert.equal(rotuloSistema({ nome: "Gestão de Contratos", sigla: "GCONT" }), "Gestão de Contratos (GCONT)");
  assert.equal(rotuloSistema({ nome: "SPF", sigla: "spf" }), "SPF");
});
