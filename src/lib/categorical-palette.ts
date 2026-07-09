/**
 * Paleta categórica única do app — tokens do DS (AGENTS.md: cor só via
 * var(--ds-*)), mesma rotação em todo gráfico que precisa diferenciar N
 * categorias por índice. Centralizada aqui pra não divergir entre gráficos
 * (antes: browser-icon-map e CategoryDonut tinham cada um sua própria lista).
 */
export const PALETA_CATEGORICA = [
  "--ds-color-primary-600",
  "--ds-color-secondary-600",
  "--ds-color-blue-600",
  "--ds-color-orange-600",
  "--ds-color-green-600",
  "--ds-color-neutral-500",
];

export function corCategorica(index: number): string {
  return `var(${PALETA_CATEGORICA[index % PALETA_CATEGORICA.length]})`;
}
