import { test } from "node:test";
import assert from "node:assert/strict";
import { MUNICIPIOS_MS, municipiosComAcesso, municipiosSemAcesso } from "./municipios-ms.ts";

test("MS tem exatamente 79 municipios, sem duplicata", () => {
  assert.equal(MUNICIPIOS_MS.length, 79);
  assert.equal(new Set(MUNICIPIOS_MS).size, 79);
});

test("municipiosSemAcesso: cruza ignorando acento e caixa", () => {
  const r = municipiosSemAcesso([
    { cidade: "campo grande", visitas: 10 }, // caixa diferente
    { cidade: "Tres Lagoas", visitas: 5 }, // sem acento
    { cidade: "ANGELICA", visitas: 1 }, // caixa + sem acento
  ]);
  assert.ok(!r.includes("Campo Grande"));
  assert.ok(!r.includes("Três Lagoas"));
  assert.ok(!r.includes("Angélica"));
  assert.equal(r.length, 76);
});

test("municipiosSemAcesso: grafia divergente da geolocalizacao casa via alias", () => {
  // A fonte de geolocalização escreve "Bataiporã"; o nome oficial é "Batayporã".
  // Sem o alias, o município apareceria como "sem acesso" tendo tido visitas.
  const r = municipiosSemAcesso([{ cidade: "Bataiporã", visitas: 25763 }]);
  assert.ok(!r.includes("Batayporã"));
});

test("municipiosSemAcesso: sem visita nenhuma -> todos os 79", () => {
  assert.equal(municipiosSemAcesso([]).length, 79);
});

test("municipiosSemAcesso: ruido de geolocalizacao nao remove municipio real", () => {
  // "Parque dos Poderes" é um bairro de Campo Grande que a geolocalização
  // reporta como cidade — não deve casar com nada da lista oficial.
  const r = municipiosSemAcesso([{ cidade: "Parque dos Poderes", visitas: 1035 }]);
  assert.equal(r.length, 79);
});

test("com + sem acesso sempre fecha em 79, mesmo com ruido de geolocalizacao", () => {
  // Bug real pego na revisão: o KPI contava o que a geolocalização reportou
  // (com ruído) e os ausentes vinham da lista oficial — a tela mostrava
  // "49 de 79 com acesso" ao lado de "34 sem acesso" (soma 83).
  const cidades = [
    { cidade: "Campo Grande", visitas: 100 },
    { cidade: "Dourados", visitas: 50 },
    { cidade: "Parque dos Poderes", visitas: 10 }, // bairro, não município
    { cidade: "Pôrto Barra do Ivinheima", visitas: 5 }, // grafia inexistente
  ];
  const com = municipiosComAcesso(cidades);
  const sem = municipiosSemAcesso(cidades);
  assert.equal(com.length, 2); // só os 2 municípios reais
  assert.equal(com.length + sem.length, MUNICIPIOS_MS.length);
  assert.equal(new Set([...com, ...sem]).size, 79); // sem sobreposição
});
