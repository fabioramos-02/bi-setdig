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
  // presença oferecida como opção não obriga
  assert.equal(classificarN4(carta("Contato por e-mail, telefone ou pessoalmente no endereço da sede")).categoria, "so-email");
  assert.equal(classificarN4(carta("Protocolar pessoalmente ou via e-mail")).categoria, "so-email");
});

test("classificarN4: link vazio não é sistema; preencher formulário sozinho não é download", () => {
  assert.equal(classificarN4(carta("Solicite pelo e-mail http://   e aguarde")).categoria, "so-email");
  assert.equal(classificarN4(carta("Faça login no gov.br e preencha o formulário. Dúvidas: a@x.ms.gov.br")).categoria, "online");
});

test("classificarN4: marcação Presencial da etapa no banco não conta (órgão marca passo interno)", () => {
  const base = carta("Acesse o sistema e faça o pedido");
  const marcada = { ...base, etapas: [...base.etapas, { titulo: "Análise técnica", texto: "O órgão analisa", canais: ["Presencial"] }] };
  assert.equal(classificarN4(marcada).categoria, "online");
});

test("classificarN4: presença com alternativa por e-mail mais adiante na frase é opção", () => {
  const r = classificarN4(carta("Baixe o requerimento https://x.ms.gov.br/req.doc. Entregue presencialmente na Central de Atendimento, Unidade Regional ou Escritório Local; ou pelo e-mail atendimento@x.ms.gov.br."));
  assert.equal(r.categoria, "formulario-email");
});

test("classificarN4: canal presencial rotulado numa lista de formas de entrega é opção", () => {
  assert.equal(classificarN4(carta("Formas de entrega: pessoalmente: compareça a uma unidade local. Por e-mail: cadastro@iagro.ms.gov.br")).categoria, "so-email");
  // obrigação de verdade continua presencial
  assert.equal(classificarN4(carta("Solicitação presencial. Dirigir-se pessoalmente a uma agência, portando documentos")).categoria, "presencial");
});

test("classificarN4: revisão da SGD vence a leitura automática e se identifica", () => {
  const r = classificarN4(carta("Compareça à unidade", { slug: "solicitar-participacao-no-icms-ecologico-componente-unidades-de-conservacao-e-terras-indigenas70" }));
  assert.equal(r.categoria, "formulario-email");
  assert.match(r.evidencia ?? "", /Revisado pela equipe da SGD/);
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
