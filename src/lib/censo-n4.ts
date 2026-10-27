import type { LinhaCensal, OrgaoCenso } from "./censo";

/**
 * Nível 4 na prática — cruza os serviços que os órgãos declararam "100%
 * online" (nível 4 do censo) com as etapas publicadas na carta do Portal
 * Único, para ver como o cidadão realmente faz o pedido. O caso que motivou o
 * painel: carta nível 4 que manda baixar formulário e mandar por e-mail —
 * conta como digital, mas não facilita.
 *
 * Etapas: datasets/censo/v2/etapas-n4.json (data-platform/build_etapas_n4.py).
 */

/** Etapas de uma carta como publicadas no portal (texto já sem HTML; links
 * viram texto, porque o destino — .pdf, e-mail, sistema — é o que classifica). */
export type EtapasCarta = {
  id: string; // mesmo id da carta no censo
  slug: string;
  etapas: { titulo: string; texto: string }[];
  linkAcesso: string | null; // botão "Acessar serviço" da carta, quando habilitado
  linkIntegrado: boolean;
};

export type CategoriaN4 = "presencial" | "formulario-email" | "online" | "so-email" | "sem-descricao" | "sem-carta";

/** Ordem = prioridade de exibição (do pior pro melhor, honestidade no fim). */
export const CATEGORIAS_N4: { id: CategoriaN4; rotulo: string; descricao: string; cor: string }[] = [
  {
    id: "presencial", rotulo: "Ainda pede ida presencial", cor: "var(--ds-color-danger)",
    descricao: "A carta manda comparecer, entregar documento ou protocolar em uma unidade.",
  },
  {
    id: "formulario-email", rotulo: "Baixa formulário e envia por e-mail", cor: "#ff6200",
    descricao: "O cidadão baixa ou imprime um formulário, preenche e manda por e-mail — sem sistema que receba o pedido.",
  },
  {
    id: "so-email", rotulo: "Pedido só por e-mail", cor: "var(--ds-color-info)",
    descricao: "O pedido é feito mandando e-mail com documentos, sem formulário próprio.",
  },
  {
    id: "online", rotulo: "Formulário online ou sistema", cor: "var(--ds-color-success)",
    descricao: "O pedido é feito direto em formulário na internet ou em sistema do órgão.",
  },
  {
    id: "sem-descricao", rotulo: "Carta não diz como pedir", cor: "var(--ds-color-neutral-500)",
    descricao: "As etapas publicadas não dizem por onde o pedido é feito.",
  },
  {
    id: "sem-carta", rotulo: "Sem carta no portal", cor: "var(--ds-color-neutral-800)",
    descricao: "Não foi possível ligar o serviço a uma carta publicada no Portal Único.",
  },
];

export function rotuloCategoriaN4(id: CategoriaN4): string {
  return CATEGORIAS_N4.find((c) => c.id === id)?.rotulo ?? id;
}

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ponytail: palavra-chave sobre o texto da carta, não leitura humana. Teto:
// carta mal escrita cai na categoria errada — a evidência na tabela deixa o
// gestor conferir. Upgrade: revisão manual dos casos "Carta não diz como pedir".
const PRESENCIAL = ["comparec", "presencialmente", "dirigir-se", "dirija-se", "pessoalmente", "balcao", "protocolar na", "protocolo fisico", "atendimento presencial"];
// Baixar/imprimir/preencher + formulário (ou formulário apontando pra .pdf/.doc).
// Verbo solto não basta: "baixe o certificado" acontece em serviço com sistema.
const DOWNLOAD = /(baix|download|imprim|preench)\w*[^.|]{0,40}(formulario|requerimento|ficha|modelo|anexo)|(formulario|requerimento|ficha|modelo)[^.|]{0,60}\.(pdf|docx?|odt)\b/;
const EMAIL = ["e-mail", "email", "mailto:"];
const ONLINE = ["forms.ms.gov.br", "xforms", "sistema", "plataforma", "gov.br", "acesse o link", "acessar servico", "aplicativo", "http"];
const RE_EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
// "não precisa comparecer", "sem necessidade de comparecimento" não contam.
const NEGACAO = /\b(nao|sem|dispensa\w*)\b[^.;]{0,30}$/;

/** Primeira palavra da lista que aparece, com o trecho em volta. `negavel`:
 * ignora ocorrência logo após "não/sem/dispensa" (só faz sentido pra presença). */
function achar(texto: string, palavras: string[], negavel = false): string | null {
  for (const p of palavras) {
    let i = texto.indexOf(p);
    while (i >= 0) {
      if (!negavel || !NEGACAO.test(texto.slice(Math.max(0, i - 40), i))) {
        return texto.slice(Math.max(0, i - 50), i + p.length + 50).trim();
      }
      i = texto.indexOf(p, i + 1);
    }
  }
  return null;
}

export type ClassificacaoN4 = { categoria: CategoriaN4; evidencia: string | null };

/**
 * Prioridade (primeira que bate): presencial > baixa formulário (+ e-mail, ou
 * sem sistema que receba) > formulário online/sistema > só e-mail > não diz.
 * Online vem antes de "só e-mail": e-mail de contato numa carta com sistema
 * não faz dela "só e-mail".
 */
export function classificarN4(etapas: EtapasCarta | undefined): ClassificacaoN4 {
  if (!etapas) return { categoria: "sem-carta", evidencia: null };
  const texto = normalizar(etapas.etapas.map((e) => `${e.titulo}. ${e.texto}`).join(" | "));
  // e-mail no domínio gov.br não pode virar sinal de "sistema gov.br"
  const semEmail = texto.replace(new RegExp(RE_EMAIL, "g"), " ").replace(/mailto:\S*/g, " ");
  const temEmail = RE_EMAIL.test(texto) || achar(texto, EMAIL) !== null;
  const linkSistema = etapas.linkIntegrado || (etapas.linkAcesso !== null && !/\.(pdf|docx?|odt)$/i.test(etapas.linkAcesso));
  const online = achar(semEmail.replace(/https?:\S+\.(pdf|docx?|odt)\b/g, " "), ONLINE);

  const presencial = achar(texto, PRESENCIAL, true);
  if (presencial) return { categoria: "presencial", evidencia: presencial };

  const m = DOWNLOAD.exec(texto);
  if (m && (temEmail || (!online && !linkSistema))) {
    return { categoria: "formulario-email", evidencia: texto.slice(Math.max(0, m.index - 30), m.index + m[0].length + 50).trim() };
  }

  if (online || linkSistema) return { categoria: "online", evidencia: online ?? `Botão "Acessar serviço": ${etapas.linkAcesso ?? "serviço integrado ao portal"}` };

  if (temEmail) return { categoria: "so-email", evidencia: achar(texto, EMAIL) ?? texto.match(RE_EMAIL)?.[0] ?? null };

  return { categoria: "sem-descricao", evidencia: null };
}

export type CartaN4 = LinhaCensal & { orgaoSigla: string } & ClassificacaoN4;

export type OrgaoN4 = { sigla: string; nome: string; total: number; formularioEmail: number; pctFormularioEmail: number };

export type PanoramaN4 = {
  cartas: CartaN4[];
  porCategoria: { id: CategoriaN4; rotulo: string; cor: string; qtd: number; pct: number }[];
  /** Órgãos com pelo menos 1 carta "baixa formulário e envia por e-mail", por qtd desc. */
  orgaos: OrgaoN4[];
  comEtapas: number; // cartas nível 4 com carta lida no portal (base da classificação)
};

const pct = (n: number, base: number) => (base ? Math.round((1000 * n) / base) / 10 : 0);

/** Panorama das cartas nível 4 do governo. % sobre TODAS as nível 4 (inclui
 * "sem carta" e "não diz como pedir" — a lacuna aparece, não some da base). */
export function panoramaN4(orgaos: OrgaoCenso[], etapas: EtapasCarta[]): PanoramaN4 {
  const porId = new Map(etapas.map((e) => [e.id, e]));
  const cartas: CartaN4[] = orgaos.flatMap((o) =>
    o.cartas.filter((c) => c.nivel === 4).map((c) => ({ ...c, orgaoSigla: o.orgaoSigla, ...classificarN4(porId.get(c.id)) })),
  );
  const total = cartas.length;
  const porCategoria = CATEGORIAS_N4.map((cat) => {
    const qtd = cartas.filter((c) => c.categoria === cat.id).length;
    return { id: cat.id, rotulo: cat.rotulo, cor: cat.cor, qtd, pct: pct(qtd, total) };
  });
  const orgaosN4: OrgaoN4[] = orgaos
    .map((o) => {
      const doOrgao = cartas.filter((c) => c.orgaoSigla === o.orgaoSigla);
      const fe = doOrgao.filter((c) => c.categoria === "formulario-email").length;
      return { sigla: o.orgaoSigla, nome: o.orgaoNome, total: doOrgao.length, formularioEmail: fe, pctFormularioEmail: pct(fe, doOrgao.length) };
    })
    .filter((o) => o.formularioEmail > 0)
    .sort((a, b) => b.formularioEmail - a.formularioEmail || b.pctFormularioEmail - a.pctFormularioEmail);
  return { cartas, porCategoria, orgaos: orgaosN4, comEtapas: cartas.filter((c) => c.categoria !== "sem-carta").length };
}
