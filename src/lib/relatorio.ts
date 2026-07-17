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

const semPrefixoOrdem = (label: string) => label.replace(/^\d+\.\s*/, "").trim();

/** Nome do arquivo PDF exportado, conforme o que entra no relatório. `base` vem
 * do título da página ("Portal Único | SETDIG" → "Portal Único"). O sufixo
 * reflete a seleção:
 *   - nenhuma seção (páginas sem abas)        → "Portal Único"
 *   - todas as seções marcadas                → "Portal Único - Relatório completo"
 *   - uma seção                               → "Portal Único - Intenção de Busca"
 *   - algumas                                 → "Portal Único - Visão Geral, Intenção de Busca"
 * (rótulos sem o prefixo de ordem "3. "). O navegador usa o `document.title`
 * como nome padrão do PDF no diálogo de impressão. */
export function nomeArquivoRelatorio(tituloPagina: string, selecionadas: SecaoExport[], totalSecoes: number): string {
  const base = tituloPagina.split("|")[0].trim();
  if (selecionadas.length === 0) return base;
  if (totalSecoes > 1 && selecionadas.length === totalSecoes) return `${base} - Relatório completo`;
  return `${base} - ${selecionadas.map((s) => semPrefixoOrdem(s.label)).join(", ")}`;
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
