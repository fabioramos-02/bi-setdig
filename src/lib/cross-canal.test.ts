import { test } from "node:test";
import assert from "node:assert/strict";
import { compararCanais } from "./cross-canal.ts";
import type { GA4Overview, Plataforma, Servico, Dispositivo } from "./data.ts";

const appVisaoGeral: GA4Overview[] = [
  { newVsReturning: "new", activeUsers: 100, sessions: 120, screenPageViews: 300 },
  { newVsReturning: "returning", activeUsers: 400, sessions: 500, screenPageViews: 900 },
];
const appServicos: Servico[] = [
  { servico: "Contracheque", acessos: 50 },
  { servico: "Cartão SUS", acessos: 30 },
  { servico: "CDIEMS", acessos: 20 },
];
const portalServicos = [
  { servico: "IPVA", visitas: 900 },
  { servico: "Inscrição estadual", visitas: 700 },
];
const appPlataforma: Plataforma[] = [{ operatingSystem: "Android", activeUsers: 350 }];
const portalDispositivos: Dispositivo[] = [{ dispositivo: "Desktop", visitas: 600 }];

test("alcanceApp soma activeUsers; alcancePortal vem de portalUniques", () => {
  const r = compararCanais({ appVisaoGeral, appServicos, appPlataforma, portalUniques: 5000, portalServicos, portalDispositivos });
  assert.equal(r.alcanceApp, 500); // 100 + 400
  assert.equal(r.alcancePortal, 5000);
});

test("mapeia acessos→valor (app) e visitas→valor (portal), sem join entre listas", () => {
  const r = compararCanais({ appVisaoGeral, appServicos, appPlataforma, portalUniques: 1, portalServicos, portalDispositivos });
  assert.deepEqual(r.appServicos[0], { servico: "Contracheque", valor: 50 });
  assert.deepEqual(r.portalServicos[0], { servico: "IPVA", valor: 900 });
  // listas independentes: nenhum nome do app aparece no portal e vice-versa
  const nomesApp = r.appServicos.map((s) => s.servico);
  const nomesPortal = r.portalServicos.map((s) => s.servico);
  assert.equal(nomesApp.some((n) => nomesPortal.includes(n)), false);
});

test("respeita topN (corta cada lado), assume array já ordenado", () => {
  const r = compararCanais({ appVisaoGeral, appServicos, appPlataforma, portalUniques: 1, portalServicos, portalDispositivos, topN: 2 });
  assert.equal(r.appServicos.length, 2);
  assert.equal(r.portalServicos.length, 2);
  assert.equal(r.appServicos[1].servico, "Cartão SUS");
});

test("topN default = 5", () => {
  const r = compararCanais({ appVisaoGeral, appServicos, appPlataforma, portalUniques: 1, portalServicos, portalDispositivos });
  assert.equal(r.appServicos.length, 3); // só tem 3, não corta
});

test("plataforma/dispositivos passam direto, sem transformação", () => {
  const r = compararCanais({ appVisaoGeral, appServicos, appPlataforma, portalUniques: 1, portalServicos, portalDispositivos });
  assert.deepEqual(r.appPlataforma, appPlataforma);
  assert.deepEqual(r.portalDispositivos, portalDispositivos);
});
