import type { InventarioOrgao, MaturidadeOrigem } from "./data";

/**
 * Rótulos e cortes do inventário de cartas — cálculo fora do componente
 * (convencoes.md). Nível de maturidade é heurística sobre booleanos de
 * cadastro (digital/online/agendável/acesso externo), não classificação por
 * rubrica humana — ver data-platform/transform/servicos_cartas.py.
 */
export const NIVEL_MATURIDADE_LABEL: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Apenas presencial",
  1: "Informação online",
  2: "Início digital",
  3: "Quase digital",
  4: "100% digital",
};

export function topOrgaos(orgaos: InventarioOrgao[], n: number): InventarioOrgao[] {
  return orgaos.slice(0, n);
}

export const ORIGEM_MATURIDADE_LABEL: Record<MaturidadeOrigem, string> = {
  classificada: "Revisado por rubrica",
  heuristica: "Aproximação por cadastro",
};

/** "saude-e-cuidado" -> "Saúde e cuidado" — slug de tema não tem coluna de
 * nome confirmada no banco (ver investigação), então formata em runtime. */
export function labelCategoria(slug: string | null): string {
  if (!slug) return "Sem categoria";
  const texto = slug.replace(/-/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
