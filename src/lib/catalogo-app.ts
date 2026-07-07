import type { ServicoCatalogo } from "./data";

/**
 * Agregações do catálogo de serviços do app (nativo × web) — cálculo fora do
 * componente (convencoes.md). Estático: não depende de período. Ícones por
 * categoria portados do bench-carta `src/ms_digital_catalog.py`.
 */

// Ícone Material por categoria (áreas de atuação do xlsx). Fallback "apps".
const ICONE_CATEGORIA: Record<string, string> = {
  "MS.gov": "public",
  Agronegócio: "agriculture",
  Trânsito: "directions_car",
  "Procon-MS": "gavel",
  Transparência: "visibility",
  Segurança: "security",
  "Servidor Público": "badge",
  "Meio Ambiente": "eco",
  "Mulher MS": "woman",
  Saúde: "local_hospital",
  AGEMS: "bolt",
  "Diário Oficial": "newspaper",
  Turismo: "travel_explore",
  Entretenimento: "live_tv",
  Educação: "school",
  "Nota Premiada": "confirmation_number",
  Habitação: "home",
  "Cultura e Esporte": "sports_soccer",
  "Assistência Social": "groups",
  "Trabalho e Qualificação": "work",
  Coronavírus: "coronavirus",
  Notícias: "feed",
};

export function iconeCategoria(categoria: string): string {
  return ICONE_CATEGORIA[categoria] ?? "apps";
}

export type ResumoCatalogo = {
  total: number;
  nativo: number;
  web: number;
  ativo: number;
  inativo: number;
  categorias: number;
};

export function resumoCatalogo(servicos: ServicoCatalogo[]): ResumoCatalogo {
  const nativo = servicos.filter((s) => s.tipo === "nativo").length;
  const ativo = servicos.filter((s) => s.ativo).length;
  return {
    total: servicos.length,
    nativo,
    web: servicos.length - nativo,
    ativo,
    inativo: servicos.length - ativo,
    categorias: new Set(servicos.map((s) => s.categoria)).size,
  };
}

export type CategoriaResumo = {
  categoria: string;
  icone: string;
  total: number;
  nativo: number;
  web: number;
  ativo: number;
};

/** Uma linha por categoria, ordenada por nº de serviços (desc). */
export function porCategoria(servicos: ServicoCatalogo[]): CategoriaResumo[] {
  const mapa = new Map<string, CategoriaResumo>();
  for (const s of servicos) {
    const c =
      mapa.get(s.categoria) ??
      { categoria: s.categoria, icone: iconeCategoria(s.categoria), total: 0, nativo: 0, web: 0, ativo: 0 };
    c.total += 1;
    if (s.tipo === "nativo") c.nativo += 1;
    else c.web += 1;
    if (s.ativo) c.ativo += 1;
    mapa.set(s.categoria, c);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}
