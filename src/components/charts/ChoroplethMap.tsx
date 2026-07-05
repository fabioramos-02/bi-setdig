"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLog } from "d3-scale";
import { normalizarNomeCidade } from "@/lib/normalizar-cidade";
import { resolveCssVar } from "@/lib/resolve-css-var";
import { useMounted } from "@/lib/use-mounted";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { MapLegend } from "@/components/charts/MapLegend";
import type { Cidade } from "@/lib/data";

const GEOJSON_URL = "/geo/ms-municipios.geojson";
const CENTRO_MS: [number, number] = [-54.64639, -20.44278];

// Fallback claro (tema padrão) pro primeiro paint — igual em servidor e
// cliente, evita mismatch de hidratação. useEffect resolve o valor real
// (e reage a troca de tema) logo em seguida.
const CORES_INICIAIS = { corMin: "#f9f9f9", corMax: "#004f9f", corVazio: "#f9f9f9", corBorda: "#d5d5d5" };

type Hover = { x: number; y: number; nome: string; visitas: number };

/**
 * Mapa coroplético de MS — réplica do px.choropleth_mapbox do app antigo
 * (views/portal/tab1_perfil.py), trocando Plotly (~1MB) por react-simple-maps
 * (SVG puro, ~30-50KB) sobre o mesmo geojson. Tooltip e legenda customizados
 * (não o `<title>` nativo do SVG, que não estiliza).
 */
export function ChoroplethMap({ cidades }: { cidades: Cidade[] }) {
  // `resolvedTheme` só é lido pra forçar recálculo quando o tema muda —
  // resolveCssVar é barato, recomputar a cada render evita setState-em-effect
  // (react-hooks/set-state-in-effect) sem precisar de estado extra.
  useTheme();
  const mounted = useMounted();
  const [hover, setHover] = useState<Hover | null>(null);

  // d3 não interpola "var(--ds-*)" direto (produz token inválido nos valores
  // intermediários) — resolve pro hex real. Antes do mount usa o fallback
  // claro (mesmo valor em servidor/cliente, evita mismatch de hidratação).
  const cores = mounted
    ? {
        corMin: resolveCssVar("--ds-color-neutral-100"),
        corMax: resolveCssVar("--ds-color-primary-600"),
        corVazio: resolveCssVar("--ds-color-background-muted"),
        corBorda: resolveCssVar("--ds-color-border"),
      }
    : CORES_INICIAIS;

  const porNome = new Map(cidades.map((c) => [normalizarNomeCidade(c.cidade), c.visitas]));
  const max = Math.max(1, ...cidades.map((c) => c.visitas));
  const escalaCor = scaleLog<string>().domain([1, max]).range([cores.corMin, cores.corMax]);

  return (
    <div>
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
                    fill={visitas > 0 ? escalaCor(Math.max(1, visitas)) : cores.corVazio}
                    stroke={cores.corBorda}
                    strokeWidth={0.5}
                    onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, nome, visitas })}
                    onMouseMove={(e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: cores.corMax, outline: "none", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      <MapLegend min={0} max={max} corMin={cores.corMin} corMax={cores.corMax} />
      {hover && (
        <ChartTooltip x={hover.x} y={hover.y}>
          {hover.nome}: {hover.visitas.toLocaleString("pt-BR")} visitas
        </ChartTooltip>
      )}
    </div>
  );
}
