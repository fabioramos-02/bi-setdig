import type { FrequenciaAcesso, FaixaAcesso } from "./data";
import type { InsightFunil } from "./insights";
import type { PontoAtencao } from "./insights-contas";
import { rotuloEstagioFunil } from "./insights";

/** Frase-âncora sobre cadência de retorno. Foca no intervalo médio quando
 *  disponível; degrada graciosamente pra "sem dados suficientes". */
export function fraseCadencia(freq: FrequenciaAcesso): string {
  if (freq.diasEntreAcessos === null || freq.diasEntreAcessos <= 0) {
    return "Ainda não há dados suficientes para calcular a cadência de retorno.";
  }
  const dias = freq.diasEntreAcessos;
  const rotulo =
    dias < 2
      ? `menos de 2 dias`
      : dias < 7
      ? `${dias.toFixed(1)} dias`
      : dias < 14
      ? `cerca de ${Math.round(dias)} dias`
      : `${Math.round(dias)} dias`;
  return `Cada usuário volta ao app em média a cada ${rotulo}.`;
}

/** Interpreta stickiness de forma direta pra gestor não-técnico. */
export function interpretaStickiness(freq: FrequenciaAcesso): string {
  const s = freq.stickinessPct;
  if (s === 0) return "";
  if (s >= 20) return `Base engajada — ${s.toFixed(1)}% dos usuários mensais abrem o app todo dia.`;
  if (s >= 10) return `Engajamento moderado — ${s.toFixed(1)}% dos usuários mensais abrem o app diariamente.`;
  return `Baixa frequência diária — apenas ${s.toFixed(1)}% dos usuários mensais voltam no mesmo dia.`;
}

function acharFaixa(faixas: FaixaAcesso[], nome: string): FaixaAcesso | undefined {
  return faixas.find((f) => f.faixa === nome);
}

export type SaudeJornada = "verde" | "amarelo" | "vermelho";

/** Semáforo da aba Jornada. Vermelho quando app perdeu a habitualidade
 *  (uso único domina) OU frequência diária é muito baixa. Espelha o padrão
 *  de saudeAtivacao em insights-contas.ts. */
export function saudeJornada(
  frequencia: FrequenciaAcesso | null,
  faixas: FaixaAcesso[],
): { nivel: SaudeJornada; texto: string } {
  const stickiness = frequencia?.stickinessPct ?? 0;
  const unicaPct = acharFaixa(faixas, "Uma vez apenas")?.percentPct ?? 0;

  if (stickiness < 10 || unicaPct > 40) {
    return {
      nivel: "vermelho",
      texto: "Retenção crítica — a maior parte dos cadastrados usa o app uma vez só ou volta muito pouco.",
    };
  }
  if (stickiness < 20 || unicaPct > 25) {
    return {
      nivel: "amarelo",
      texto: "Retenção com pontos de atenção — parte relevante dos cidadãos não retorna com frequência.",
    };
  }
  return {
    nivel: "verde",
    texto: "Base engajada — usuários voltam ao app com frequência.",
  };
}

/** Texto narrativo de 3-4 frases pro topo da aba (padrão Situação Geral).
 *  Mescla achado do funil + cadência + fricção de uso único. */
export function situacaoJornada(
  insightFunil: InsightFunil | null,
  frequencia: FrequenciaAcesso | null,
  faixas: FaixaAcesso[],
): string {
  const partes: string[] = [];

  if (insightFunil) {
    partes.push(
      `A maior perda no funil está entre "${rotuloEstagioFunil(insightFunil.estagioAtual)}" e "${rotuloEstagioFunil(
        insightFunil.estagioProximo,
      )}" (queda de ${insightFunil.quedaPct.toFixed(0)}%).`,
    );
  }

  const dias = frequencia?.diasEntreAcessos ?? null;
  if (frequencia && dias !== null && dias > 0) {
    partes.push(
      `Em média, cada cidadão volta ao app a cada ${Math.round(dias)} dias, e apenas ${frequencia.stickinessPct.toFixed(1)}% dos usuários do mês voltam no mesmo dia.`,
    );
  }

  const uma = acharFaixa(faixas, "Uma vez apenas");
  if (uma && uma.quantidade > 0) {
    partes.push(
      `${uma.percentPct.toFixed(1)}% das ${faixas.reduce((a, f) => a + f.quantidade, 0).toLocaleString("pt-BR")} contas criaram cadastro e não voltaram (${uma.quantidade.toLocaleString("pt-BR")} pessoas).`,
    );
  }

  return partes.join(" ") || "Ainda não há dados suficientes para descrever a jornada.";
}

/** Bullets acionáveis pro bloco "Pontos de atenção". Reusa o tipo
 *  PontoAtencao já exportado por insights-contas.ts. */
export function pontosAtencaoJornada(
  insightFunil: InsightFunil | null,
  frequencia: FrequenciaAcesso | null,
  faixas: FaixaAcesso[],
): PontoAtencao[] {
  const out: PontoAtencao[] = [];

  if (insightFunil && insightFunil.quedaPct > 30) {
    out.push({
      severidade: insightFunil.quedaPct > 50 ? "alerta" : "atencao",
      texto: `Queda de ${insightFunil.quedaPct.toFixed(0)}% entre "${rotuloEstagioFunil(
        insightFunil.estagioAtual,
      )}" e "${rotuloEstagioFunil(insightFunil.estagioProximo)}" — investigar fricção nessa transição.`,
    });
  }

  const uma = acharFaixa(faixas, "Uma vez apenas");
  if (uma && uma.percentPct > 30) {
    out.push({
      severidade: uma.percentPct > 40 ? "alerta" : "atencao",
      texto: `${uma.percentPct.toFixed(1)}% dos cadastrados usaram o app uma vez só (${uma.quantidade.toLocaleString("pt-BR")} pessoas) — revisar primeiro uso e ativação.`,
    });
  }

  if (frequencia && frequencia.stickinessPct > 0 && frequencia.stickinessPct < 10) {
    out.push({
      severidade: "alerta",
      texto: `Apenas ${frequencia.stickinessPct.toFixed(1)}% dos usuários mensais voltam no mesmo dia — hábito diário fraco.`,
    });
  }

  const diasMedios = frequencia?.diasEntreAcessos ?? null;
  if (diasMedios !== null && diasMedios > 30) {
    out.push({
      severidade: "atencao",
      texto: `Intervalo médio entre acessos é de ${Math.round(diasMedios)} dias — cidadão só volta quando precisa, não como hábito.`,
    });
  }

  const antigas = acharFaixa(faixas, "Mais de 4 anos");
  const doisQuatro = acharFaixa(faixas, "Entre 2 e 4 anos");
  const abandono = (antigas?.percentPct ?? 0) + (doisQuatro?.percentPct ?? 0);
  if (abandono > 30) {
    out.push({
      severidade: "atencao",
      texto: `${abandono.toFixed(1)}% das contas estão sem acesso há mais de 2 anos — considerar campanha de reengajamento ou expurgo.`,
    });
  }

  return out;
}

/** Os 4 KPIs do topo, calculados juntos pra o .tsx não misturar lógica. */
export type KpisJornada = {
  usuariosAtivos: number;
  rotuloUsuarios: string;
  recorrentesPct: number | null;
  novos: number;
  recorrentes: number;
  maiorAbandonoPct: number | null;
  maiorAbandonoEstagio: string | null;
  diasEntreAcessos: number | null;
};

export function kpisJornada(
  novos: number,
  recorrentes: number,
  rotuloPeriodo: string,
  insightFunil: InsightFunil | null,
  frequencia: FrequenciaAcesso | null,
): KpisJornada {
  const totalUsuarios = novos + recorrentes;
  return {
    usuariosAtivos: totalUsuarios,
    rotuloUsuarios: rotuloPeriodo,
    recorrentesPct: totalUsuarios > 0 ? (100 * recorrentes) / totalUsuarios : null,
    novos,
    recorrentes,
    maiorAbandonoPct: insightFunil ? insightFunil.quedaPct : null,
    maiorAbandonoEstagio: insightFunil
      ? rotuloEstagioFunil(insightFunil.estagioProximo)
      : null,
    diasEntreAcessos: frequencia?.diasEntreAcessos != null && frequencia.diasEntreAcessos > 0
      ? frequencia.diasEntreAcessos
      : null,
  };
}
