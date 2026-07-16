/** Lógica do "Exportar Relatório" — decide o que entra no PDF e formata os
 * metadados da capa. Pura (sem DOM/React) pra ser testável (ver relatorio.test.ts).
 * O disparo do print e o toggle de classes ficam no ExportarRelatorioButton. */

export type SecaoExport = { id: string; label: string };

/** Ids das seções que NÃO entram no PDF (o complemento das selecionadas). São
 * essas que ganham `.exportar-excluir` e somem no @media print. */
export function idsExcluidos(secoes: SecaoExport[], selecionadas: Iterable<string>): string[] {
  const marcadas = new Set(selecionadas);
  return secoes.filter((s) => !marcadas.has(s.id)).map((s) => s.id);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Data/hora de extração em português: "16 de julho de 2026 às 14h32". */
export function formatarExtracao(d: Date): string {
  const dia = d.getDate();
  const mes = MESES[d.getMonth()];
  const ano = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia} de ${mes} de ${ano} às ${h}h${min}`;
}
