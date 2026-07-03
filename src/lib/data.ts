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
