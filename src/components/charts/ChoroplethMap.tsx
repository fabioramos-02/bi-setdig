"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLog } from "d3-scale";
import { normalizarNomeCidade } from "@/lib/normalizar-cidade";
import type { Cidade } from "@/lib/data";

const GEOJSON_URL = "/geo/ms-municipios.geojson";
const CENTRO_MS: [number, number] = [-54.64639, -20.44278];

/**
 * Mapa coroplético de MS — réplica do px.choropleth_mapbox do app antigo
 * (views/portal/tab1_perfil.py), trocando Plotly (~1MB) por react-simple-maps
 * (SVG puro, ~30-50KB) sobre o mesmo geojson.
 */
export function ChoroplethMap({ cidades }: { cidades: Cidade[] }) {
  const porNome = new Map(cidades.map((c) => [normalizarNomeCidade(c.cidade), c.visitas]));
  const max = Math.max(1, ...cidades.map((c) => c.visitas));
  const escalaCor = scaleLog<string>().domain([1, max]).range(["var(--ds-color-neutral-100)", "var(--ds-color-primary-600)"]);

  return (
    <div className="aspect-[4/3] w-full">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: CENTRO_MS, scale: 3200 }}
        width={800}
        height={600}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEOJSON_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const nome = geo.properties?.name ?? "";
              const visitas = porNome.get(normalizarNomeCidade(nome)) ?? 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={visitas > 0 ? escalaCor(Math.max(1, visitas)) : "var(--ds-color-background-muted)"}
                  stroke="var(--ds-color-border)"
                  strokeWidth={0.5}
                >
                  <title>{`${nome}: ${visitas.toLocaleString("pt-BR")} visitas`}</title>
                </Geography>
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
