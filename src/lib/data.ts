import fs from "node:fs";
import path from "node:path";

/**
 * Único ponto de leitura de datasets/ (ver docs/architecture/data-flow.md).
 * fs direto, não import de JSON — evita depender de resolveJsonModule e lê
 * o arquivo publicado pelo data-platform sem cache de build do bundler.
 */
function readDataset<T>(source: string, version: string, dataset: string): T | null {
  const filePath = path.join(process.cwd(), "datasets", source, version, `${dataset}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export type VisitasResumo = {
  date: string;
  visitas: number;
  visitantesUnicos: number;
  acoes: number;
};

export type GA4Overview = {
  newVsReturning: string;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
};

export function getMatomoVisitasResumo(): VisitasResumo[] | null {
  return readDataset<VisitasResumo[]>("matomo", "v1", "visitas-resumo");
}

export function getGa4VisaoGeral(): GA4Overview[] | null {
  return readDataset<GA4Overview[]>("ga4", "v1", "visao-geral");
}

export type Cidade = { cidade: string; visitas: number };
export type Navegador = { navegador: string; visitas: number };
export type Dispositivo = { dispositivo: string; visitas: number };
export type Horario = { hora: string; visitas: number };
export type Pagina = { url: string; visitas: number };
export type VisitaDiaria = { data: string; visitas: number; visitantesUnicos: number };

export function getMatomoGeografia(): Cidade[] {
  return readDataset<Cidade[]>("matomo", "v1", "geografia") ?? [];
}
export function getMatomoNavegadores(): Navegador[] {
  return readDataset<Navegador[]>("matomo", "v1", "navegadores") ?? [];
}
export function getMatomoDispositivos(): Dispositivo[] {
  return readDataset<Dispositivo[]>("matomo", "v1", "dispositivos") ?? [];
}
export function getMatomoHorarios(): Horario[] {
  return readDataset<Horario[]>("matomo", "v1", "horarios") ?? [];
}
export function getMatomoPaginas(): Pagina[] {
  return readDataset<Pagina[]>("matomo", "v1", "paginas-mais-acessadas") ?? [];
}
export function getMatomoVisitasDiarias(): VisitaDiaria[] {
  return readDataset<VisitaDiaria[]>("matomo", "v1", "visitas-diarias") ?? [];
}
