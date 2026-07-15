/**
 * Rótulos do domínio Serviços — cálculo fora do componente (convencoes.md).
 */

/** "saude-e-cuidado" -> "Saúde e cuidado" — slug de tema não tem coluna de
 * nome confirmada no banco (ver investigação), então formata em runtime. */
export function labelCategoria(slug: string | null): string {
  if (!slug) return "Sem categoria";
  const texto = slug.replace(/-/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
