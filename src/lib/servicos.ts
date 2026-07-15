/**
 * Rótulos do domínio Serviços — cálculo fora do componente (convencoes.md).
 */

/** "saude-e-cuidado" -> "Saúde e cuidado" — slug de tema não tem coluna de
 * nome confirmada no banco (ver investigação), então formata em runtime. */
export function labelCategoria(slug: string | null): string {
  if (!slug) return "Sem categoria";
  const texto = slug.replace(/-/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Prazo legível: "90 Dias corridos", mas "Acesso Imediato"/"Conforme Tabela…"
 * sem prefixar o número (o `tempoTotal` vem 1/0 nesses casos e o "1 Acesso
 * Imediato" lê errado). Só antepõe o número quando a unidade é temporal. */
export function prazoServico(tempoTotal: number | null, tipoTempo: string | null): string {
  const t = (tipoTempo ?? "").trim();
  if (!t) return "—";
  // \b evita casar "dia" dentro de "ImeDIAto" (Acesso Imediato).
  const unidadeTemporal = /\b(dias?|horas?|m[eê]s(es)?|semanas?|anos?)\b/i.test(t);
  return unidadeTemporal && tempoTotal && tempoTotal > 0 ? `${tempoTotal} ${t}` : t;
}
