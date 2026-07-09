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

export { corCategorica as corPorIndice } from "./categorical-palette";
