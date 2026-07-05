/**
 * Resolve um token --ds-* pro hex computado no navegador — necessário pra
 * escalas de cor (d3-scale) que interpolam entre 2 pontos: passar a STRING
 * "var(--ds-color-x)" direto pro d3 quebra (ele tenta interpolar os
 * caracteres do texto, não a cor real; produz token inválido pros valores
 * intermediários). Resolver pro hex real corrige isso e ainda assim não
 * hardcoda cor no código-fonte — o valor sai do token, só é lido em runtime.
 */
export function resolveCssVar(token: string): string {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || "#000000";
}
