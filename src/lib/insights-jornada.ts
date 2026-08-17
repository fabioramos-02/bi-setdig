import type { FrequenciaAcesso } from "./data";

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
