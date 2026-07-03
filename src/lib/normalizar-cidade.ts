const DIACRITICOS = /[̀-ͯ]/g;

/** Normaliza nome de cidade pra comparar dataset x geojson (acento/caixa). */
export function normalizarNomeCidade(nome: string): string {
  return nome.normalize("NFD").replace(DIACRITICOS, "").toLowerCase().trim();
}
