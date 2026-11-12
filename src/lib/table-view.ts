/** Busca e ordenação sobre a coleção inteira, antes da página. */
export function filtrarOrdenarLinhas<T>(rows: T[], busca: string, texto?: (row: T) => string, comparar?: (a: T, b: T) => number): T[] {
  const q = busca.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
  const filtradas = q && texto ? rows.filter((r) => texto(r).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").includes(q)) : rows;
  return comparar ? [...filtradas].sort(comparar) : filtradas;
}

export function paginarLinhas<T>(rows: T[], pagina: number, tamanho?: number) {
  const limite = tamanho && tamanho > 0 ? Math.max(1, Math.floor(tamanho)) : Math.max(1, rows.length);
  const paginas = Math.max(1, Math.ceil(rows.length / limite));
  const atual = Math.min(paginas, Math.max(1, Math.floor(pagina) || 1));
  const inicio = (atual - 1) * limite;
  return { pagina: atual, paginas, total: rows.length, inicio: rows.length ? inicio + 1 : 0,
    fim: Math.min(inicio + limite, rows.length), linhas: rows.slice(inicio, inicio + limite) };
}
