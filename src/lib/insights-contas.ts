import type { ContasResumo, ContaPorFaixaEtaria, UsoRetencao } from "./data";

/** Cálculos e frases-âncora pra aba "Contas" (SQL Server MS_digital).
 *  Ver docs/msdigital/spec-contas.md — texto voltado ao gestor, não à métrica.
 *  Nenhuma lógica de UI aqui; só números e frases. */

export type SaudeAtivacao = "verde" | "amarelo" | "vermelho";

export function saudeAtivacao(taxaPct: number): { nivel: SaudeAtivacao; texto: string } {
  if (taxaPct >= 90) return { nivel: "verde", texto: "Base saudável — mais de 9 em cada 10 contas seguem ativas." };
  if (taxaPct >= 80) return { nivel: "amarelo", texto: "Atenção — a taxa de ativação está entre 80% e 90%." };
  return { nivel: "vermelho", texto: "Alerta — menos de 80% das contas seguem ativas." };
}

export function pctSemInformacaoNascimento(faixas: ContaPorFaixaEtaria[]): number {
  const total = faixas.reduce((acc, f) => acc + f.quantidade, 0);
  if (total === 0) return 0;
  const semInfo = faixas.find((f) => f.faixa === "Não informado")?.quantidade ?? 0;
  return (100 * semInfo) / total;
}

export function situacaoGeral(resumo: ContasResumo, retencao: UsoRetencao | null): string {
  const partes = [
    `O app já reúne ${resumo.contasTotal.toLocaleString("pt-BR")} contas criadas desde 2020; ${resumo.taxaAtivacaoPct.toFixed(1)}% delas seguem ativas.`,
  ];
  if (retencao && retencao.recorrentes6Meses > 0) {
    partes.push(
      `Nos últimos 6 meses, ${retencao.recorrentes6Meses.toLocaleString("pt-BR")} pessoas voltaram ao app.`,
    );
  }
  if (resumo.matriculas > 0) {
    partes.push(
      `Existem ${resumo.matriculas.toLocaleString("pt-BR")} servidores com carteira funcional cadastrada.`,
    );
  }
  return partes.join(" ");
}

export type PontoAtencao = { severidade: "alerta" | "atencao" | "info"; texto: string };

export function pontosAtencao(
  resumo: ContasResumo,
  retencao: UsoRetencao | null,
  faixas: ContaPorFaixaEtaria[],
): PontoAtencao[] {
  const out: PontoAtencao[] = [];
  if (retencao && retencao.totalContas > 0) {
    const pctNunca = (100 * retencao.nuncaAcessou) / retencao.totalContas;
    if (pctNunca > 5) {
      out.push({
        severidade: "atencao",
        texto: `${pctNunca.toFixed(1)}% das contas foram criadas mas nunca abriram o app — investigar fricção no primeiro acesso.`,
      });
    }
    const pctInativos = (100 * retencao.inativos2Anos) / retencao.totalContas;
    if (pctInativos > 30) {
      out.push({
        severidade: "alerta",
        texto: `${pctInativos.toFixed(1)}% das contas estão sem acesso há mais de 2 anos — considerar campanhas de reengajamento.`,
      });
    }
  }
  const pctSemInfo = pctSemInformacaoNascimento(faixas);
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
