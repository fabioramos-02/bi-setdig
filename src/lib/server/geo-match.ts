import fs from "node:fs";
import path from "node:path";
import { normalizarNomeCidade } from "@/lib/normalizar-cidade";

/** Fração de cidades que casam com o geojson de municípios de MS — decide se
 * o mapa vira ChoroplethMap ou cai pra BarChart (ver PerfilCidadaoTab). */
export function calcularMatchRateMapa(cidades: { cidade: string; visitas: number }[]): number {
  const geojsonPath = path.join(process.cwd(), "public", "geo", "ms-municipios.geojson");
  const nomesGeojson = new Set<string>(
    JSON.parse(fs.readFileSync(geojsonPath, "utf-8")).features.map((f: { properties: { name: string } }) =>
      normalizarNomeCidade(f.properties.name)
    )
  );
  if (cidades.length === 0) return 0;
  return cidades.filter((c) => nomesGeojson.has(normalizarNomeCidade(c.cidade))).length / cidades.length;
}
