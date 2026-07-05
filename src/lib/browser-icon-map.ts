/**
 * Mapa nome Matomo → chave aceita por react-browser-icons + cor DS por índice.
 * A lib só tem 10 marcas (Chrome/Safari/Mobile Safari/Opera/Firefox/Edge/IE/
 * Brave/Samsung/Chromium — ver `BrowsersList` exportado) — "Chrome Mobile"
 * cai no ícone base "Chrome" (sem variante mobile na lib, esperado).
 */
export type ChaveIconeNavegador =
  | "Chrome"
  | "Safari"
  | "Mobile Safari"
  | "Edge"
  | "Firefox"
  | "Opera"
  | "IE"
  | "Brave"
  | "Samsung"
  | "Chromium";

const NOME_PARA_CHAVE: Record<string, ChaveIconeNavegador> = {
  Chrome: "Chrome",
  "Chrome Mobile": "Chrome",
  Safari: "Safari",
  "Mobile Safari": "Mobile Safari",
  "Microsoft Edge": "Edge",
  Edge: "Edge",
  Firefox: "Firefox",
  Opera: "Opera",
};

export function chaveDoNavegador(nomeMatomo: string): ChaveIconeNavegador | null {
  return NOME_PARA_CHAVE[nomeMatomo] ?? null;
}

const CORES = [
  "--ds-color-primary-600",
  "--ds-color-secondary-600",
  "--ds-color-blue-600",
  "--ds-color-orange-600",
  "--ds-color-neutral-500",
];

export function corPorIndice(index: number): string {
  return `var(${CORES[index % CORES.length]})`;
}
