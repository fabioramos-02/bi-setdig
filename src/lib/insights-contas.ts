import type { ContasResumo, ContaPorFaixaEtaria, FaixaAcesso, FaixaAcessoPorTipo, ContaCriadaDia } from "./data";
import type { PeriodoState } from "./period-filter";

function achaFaixa(faixas: FaixaAcesso[], nome: string): FaixaAcesso | undefined {
  return faixas.find((f) => f.faixa === nome);
}

/** Cálculos e frases-âncora pra aba "Contas" (SQL Server MS_digital).
 *  Ver docs/msdigital/spec-contas.md — texto voltado ao gestor, não à métrica.
 *  Nenhuma lógica de UI aqui; só números e frases. */

export type SaudeAtivacao = "verde" | "amarelo" | "vermelho";

export function saudeAtivacao(taxaPct: number): { nivel: SaudeAtivacao; texto: string } {
  if (taxaPct >= 90) return { nivel: "verde", texto: "Base saudável — mais de 9 em cada 10 contas seguem ativas." };
  if (taxaPct >= 80) return { nivel: "amarelo", texto: "Atenção — a taxa de ativação está entre 80% e 90%." };
  return { nivel: "vermelho", texto: "Alerta — menos de 80% das contas seguem ativas." };
}

/** Contas criadas / ativadas dentro do período do filtro (dia/semana/mês/ano/
 * intervalo). Reusa a lógica do lib/period-filter.ts sem exigir shape
 * VisitaDiaria — só filtra por data ISO. */
export function contasNoPeriodo(
  serie: ContaCriadaDia[],
  estado: PeriodoState,
): { criadas: number; ativas: number; dias: number } {
  if (serie.length === 0) return { criadas: 0, ativas: 0, dias: 0 };
  const filtro = matcherDoPeriodo(estado, serie);
  const filtradas = serie.filter((d) => filtro(d.data));
  return {
    criadas: filtradas.reduce((a, d) => a + d.criadas, 0),
    ativas: filtradas.reduce((a, d) => a + d.ativas, 0),
    dias: filtradas.length,
  };
}

function matcherDoPeriodo(estado: PeriodoState, serie: ContaCriadaDia[]): (data: string) => boolean {
  if (estado.tipo === "intervalo") {
    const inicio = estado.inicio ?? serie[0].data;
    const fim = estado.fim ?? serie[serie.length - 1].data;
    return (data) => data >= inicio && data <= fim;
  }
  const ref = estado.dataRef;
  if (estado.tipo === "dia") return (data) => data === ref;
  if (estado.tipo === "mes") return (data) => data.slice(0, 7) === ref.slice(0, 7);
  if (estado.tipo === "ano") return (data) => data.slice(0, 4) === ref.slice(0, 4);
  const chaveRef = chaveSemanaISO(ref);
  return (data) => chaveSemanaISO(data) === chaveRef;
}

function chaveSemanaISO(dataISO: string): string {
  const data = new Date(dataISO + "T00:00:00Z");
  data.setUTCDate(data.getUTCDate() + 4 - (data.getUTCDay() || 7));
  const anoISO = data.getUTCFullYear();
  const inicioAno = new Date(Date.UTC(anoISO, 0, 1));
  const semana = Math.ceil((((data.getTime() - inicioAno.getTime()) / 86400000) + 1) / 7);
  return `${anoISO}-W${String(semana).padStart(2, "0")}`;
}

export function pctSemInformacaoNascimento(faixas: ContaPorFaixaEtaria[]): number {
  const total = faixas.reduce((acc, f) => acc + f.quantidade, 0);
  if (total === 0) return 0;
  const semInfo = faixas.find((f) => f.faixa === "Não informado")?.quantidade ?? 0;
  return (100 * semInfo) / total;
}

export function situacaoGeral(resumo: ContasResumo, faixas: FaixaAcesso[]): string {
  const partes = [
    `O app já reúne ${resumo.contasTotal.toLocaleString("pt-BR")} contas criadas desde 2020; ${resumo.taxaAtivacaoPct.toFixed(1)}% delas seguem ativas.`,
  ];
  const recentes = achaFaixa(faixas, "Nos últimos 6 meses");
  if (recentes && recentes.quantidade > 0) {
    partes.push(
      `Nos últimos 6 meses, ${recentes.quantidade.toLocaleString("pt-BR")} pessoas voltaram ao app.`,
    );
  }
  if (resumo.matriculas > 0) {
    partes.push(
      `Existem ${resumo.matriculas.toLocaleString("pt-BR")} servidores com carteira funcional cadastrada.`,
    );
  }
  return partes.join(" ");
}

/** Frase-âncora da distribuição de acesso. Foca no maior segmento ou no
 *  "Uma vez apenas" quando ele é dominante (>30% = fricção crítica). */
export function fraseFaixaMaior(faixas: FaixaAcesso[]): string {
  const total = faixas.reduce((a, f) => a + f.quantidade, 0);
  if (total === 0) return "Sem contas cadastradas para analisar.";
  const uma = achaFaixa(faixas, "Uma vez apenas");
  if (uma && uma.percentPct >= 30) {
    return `${uma.percentPct.toFixed(1)}% das contas foram criadas e nunca voltaram — ${uma.quantidade.toLocaleString("pt-BR")} pessoas abriram o app apenas uma vez.`;
  }
  const recentes = achaFaixa(faixas, "Nos últimos 6 meses");
  if (recentes && recentes.percentPct >= 40) {
    return `${recentes.percentPct.toFixed(1)}% das contas voltaram ao app nos últimos 6 meses.`;
  }
  const maior = [...faixas].sort((a, b) => b.quantidade - a.quantidade)[0];
  return `A maior parte das contas (${maior.percentPct.toFixed(1)}%) se encaixa em "${maior.faixa}".`;
}

/** Frase composta usada quando o card de faixas exibe ambas as leituras
 *  (peso no total + composição Gov.BR/Próprio). Encaixa 1 ou 2 frases:
 *  a segunda só aparece se a diferença de adoção Gov.BR entre recentes e
 *  antigas for material (mesma regra de fraseAdocaoGovBrPorFaixa). */
export function fraseFaixaEAdocao(
  faixas: FaixaAcesso[],
  porTipo: FaixaAcessoPorTipo[],
): string {
  const principal = fraseFaixaMaior(faixas);
  if (porTipo.length === 0) return principal;
  const complemento = fraseAdocaoGovBrPorFaixa(porTipo);
  const genericaFallback = "Sem contas cadastradas para analisar.";
  if (complemento === genericaFallback) return principal;
  return `${principal} ${complemento}`;
}

/** Frase-âncora do cruzamento faixa de acesso × tipo de autenticação.
 *  Compara % Gov.BR entre a faixa mais recente e a mais antiga (proxy de
 *  adoção do Gov.BR entre quem volta vs quem parou). Se todas as faixas
 *  tiverem taxas parecidas ou faltar dado, degrada para o total geral. */
export function fraseAdocaoGovBrPorFaixa(faixas: FaixaAcessoPorTipo[]): string {
  const comDado = faixas.filter((f) => f.total > 0);
  if (comDado.length === 0) return "Sem contas cadastradas para analisar.";

  const totalGeral = comDado.reduce((a, f) => a + f.total, 0);
  const govbrGeral = comDado.reduce((a, f) => a + f.govbr, 0);
  const pctGeral = (100 * govbrGeral) / totalGeral;

  const recentes = comDado.find((f) => f.faixa === "Nos últimos 6 meses");
  const antigas = comDado.find((f) => f.faixa === "Mais de 4 anos");

  if (recentes && antigas && recentes.total > 0 && antigas.total > 0) {
    const pctRecentes = (100 * recentes.govbr) / recentes.total;
    const pctAntigas = (100 * antigas.govbr) / antigas.total;
    const diferenca = pctRecentes - pctAntigas;
    if (Math.abs(diferenca) >= 5) {
      const verbo = diferenca > 0 ? "sobe" : "cai";
      return `Entre quem voltou nos últimos 6 meses, ${pctRecentes.toFixed(1)}% entra pelo Gov.BR; entre contas paradas há mais de 4 anos, essa taxa ${verbo} para ${pctAntigas.toFixed(1)}%.`;
    }
  }

  return `${pctGeral.toFixed(1)}% das contas usam o Gov.BR para entrar no app, sem grande diferença entre quem volta e quem parou.`;
}

/** Frase curta qualitativa (sem números) pro anchor do StoryCard.
 *  Espelha o critério de fraseAdocaoGovBrPorFaixa (mesmas âncoras
 *  "Nos últimos 6 meses" × "Mais de 4 anos", mesmo limiar de 5 p.p.). */
export function tituloAdocaoGovBrPorFaixa(faixas: FaixaAcessoPorTipo[]): string {
  const comDado = faixas.filter((f) => f.total > 0);
  const recentes = comDado.find((f) => f.faixa === "Nos últimos 6 meses");
  const antigas = comDado.find((f) => f.faixa === "Mais de 4 anos");
  if (recentes && antigas && recentes.total > 0 && antigas.total > 0) {
    const diferenca = (100 * recentes.govbr) / recentes.total - (100 * antigas.govbr) / antigas.total;
    if (diferenca >= 5) return "A adoção do Gov.BR é maior entre as contas com acesso mais recente.";
    if (diferenca <= -5) return "A adoção do Gov.BR é maior entre contas que não acessam há mais tempo.";
  }
  return "A adoção do Gov.BR é parecida em todas as faixas de recência.";
}

export type PontoAtencao = { severidade: "alerta" | "atencao" | "info"; texto: string };

export function pontosAtencao(
  resumo: ContasResumo,
  faixasAcesso: FaixaAcesso[],
  faixasIdade: ContaPorFaixaEtaria[],
): PontoAtencao[] {
  const out: PontoAtencao[] = [];
  const uma = achaFaixa(faixasAcesso, "Uma vez apenas");
  if (uma && uma.percentPct > 10) {
    out.push({
      severidade: uma.percentPct > 30 ? "alerta" : "atencao",
      texto: `${uma.percentPct.toFixed(1)}% das contas foram criadas e nunca voltaram — investigar fricção no primeiro acesso.`,
    });
  }
  const antigas = achaFaixa(faixasAcesso, "Mais de 4 anos");
  const doisQuatro = achaFaixa(faixasAcesso, "Entre 2 e 4 anos");
  const abandono = (antigas?.percentPct ?? 0) + (doisQuatro?.percentPct ?? 0);
  if (abandono > 30) {
    out.push({
      severidade: "alerta",
      texto: `${abandono.toFixed(1)}% das contas estão sem acesso há mais de 2 anos — considerar campanhas de reengajamento.`,
    });
  }
  const recentes = achaFaixa(faixasAcesso, "Nos últimos 6 meses");
  if (recentes && recentes.percentPct >= 25) {
    out.push({
      severidade: "info",
      texto: `${recentes.percentPct.toFixed(1)}% das contas voltaram ao app nos últimos 6 meses — base engajada saudável.`,
    });
  }
  const pctSemInfo = pctSemInformacaoNascimento(faixasIdade);
  if (pctSemInfo > 50) {
    out.push({
      severidade: "info",
      texto: `${pctSemInfo.toFixed(0)}% dos cadastros estão sem data de nascimento — o perfil etário mostra apenas quem informou.`,
    });
  }
  if (resumo.taxaAtivacaoPct < 90) {
    out.push({
      severidade: "alerta",
      texto: `Taxa de ativação em ${resumo.taxaAtivacaoPct.toFixed(1)}% — investigar motivos registrados em Auditoria de Exclusão.`,
    });
  }
  return out;
}
