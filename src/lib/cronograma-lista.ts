import type { montarCronograma } from "./cronograma";

/** Alternativa textual ao SVG. Mantém os itens e as ligações já calculados no cronograma. */
export function listaDoCronograma(c: ReturnType<typeof montarCronograma>) {
  const itens = [...new Map([...c.blocos.flatMap((b) => b.pbis), ...c.soltosAbertos].map((p) => [p.id, p])).values()];
  return itens.map((item) => ({
    item, situacao: c.situacao.get(item.id) ?? "sem_sprint" as const,
    antes: itens.filter((p) => c.arestas.some(([a, b]) => a === p.id && b === item.id)),
    depois: itens.filter((p) => c.arestas.some(([a, b]) => a === item.id && b === p.id)),
  }));
}
