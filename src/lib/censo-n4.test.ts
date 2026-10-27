import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarN4, panoramaN4, type EtapasCarta } from "./censo-n4.ts";

const carta = (texto: string, extra: Partial<EtapasCarta> = {}): EtapasCarta => ({
  id: "x-1", slug: "x", etapas: [{ titulo: "Solicitação", texto }], linkAcesso: null, linkIntegrado: false, ...extra,
});

test("classificarN4: baixa formulário e manda por e-mail", () => {
  const r = classificarN4(carta("Baixe o formulário https://x.ms.gov.br/req.pdf e envie para protocolo@sad.ms.gov.br"));
  assert.equal(r.categoria, "formulario-email");
  assert.ok(r.evidencia?.includes("formulario"));
});

test("classificarN4: formulário em .pdf sem sistema também é o caso-problema", () => {
  assert.equal(classificarN4(carta("Preencha o requerimento disponível em https://x.ms.gov.br/requerimento.pdf")).categoria, "formulario-email");
});

test("classificarN4: presencial vence e-mail; negação não conta", () => {
  assert.equal(classificarN4(carta("Envie por e-mail e depois compareça à unidade com os originais")).categoria, "presencial");
  assert.equal(classificarN4(carta("Não é necessário comparecer. Acesse o sistema e faça o pedido")).categoria, "online");
});

test("classificarN4: sistema/forms ou botão de acesso = online, mesmo com e-mail de contato", () => {
  assert.equal(classificarN4(carta("Preencha em https://forms.ms.gov.br/abc. Dúvidas: duvidas@iagro.ms.gov.br")).categoria, "online");
  assert.equal(classificarN4(carta("Faça o pedido.", { linkAcesso: "https://sistema.ms.gov.br" })).categoria, "online");
  // "baixe o certificado" não é formulário
  assert.equal(classificarN4(carta("Acesse o sistema. Após aprovado, baixe o certificado.")).categoria, "online");
});

test("classificarN4: só e-mail, não diz como pedir, sem carta", () => {
  assert.equal(classificarN4(carta("Encaminhar os documentos para atendimento@agems.ms.gov.br")).categoria, "so-email");
  // e-mail gov.br não vira sinal de sistema gov.br
  assert.equal(classificarN4(carta("Mande e-mail para a@fundect.ms.gov.br")).categoria, "so-email");
  assert.equal(classificarN4(carta("O servidor analisa o pedido em até 30 dias.")).categoria, "sem-descricao");
  assert.equal(classificarN4(undefined).categoria, "sem-carta");
});

test("panoramaN4: só nível 4, % sobre todas as nível 4 (inclui sem carta)", () => {
  const c = (id: string, nivel: number) => ({ id, titulo: id, setor: null, nivel, etapaPresencial: null, demandaMensal: null, demandaTexto: null, slug: id, urlServico: null });
  const p = panoramaN4(
    [{ orgaoSigla: "AAA", orgaoNome: "Órgão A", cartas: [c("a-1", 4), c("a-2", 4), c("a-3", 5)] }],
    [{ ...carta("Baixe o formulário e envie por e-mail"), id: "a-1" }],
  );
  assert.equal(p.cartas.length, 2);
  assert.equal(p.porCategoria.find((x) => x.id === "formulario-email")?.pct, 50);
  assert.equal(p.porCategoria.find((x) => x.id === "sem-carta")?.qtd, 1);
  assert.deepEqual(p.orgaos.map((o) => [o.sigla, o.formularioEmail, o.pctFormularioEmail]), [["AAA", 1, 50]]);
  assert.equal(p.comEtapas, 1);
});
