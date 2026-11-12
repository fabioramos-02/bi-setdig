import { atrasadas, fmtData, pendencias, type TfsItem, type TfsSprint } from "./tfs.ts";

export type LinhaPrioridade = TfsItem & { motivo: string; acao: string };

/** Mesma fila do painel anterior: decisão, impedimento e demais; depois, última atualização. */
export function linhasPrioridades(itens: TfsItem[], sprints: TfsSprint[], hoje: string): LinhaPrioridade[] {
  const atraso = new Set(atrasadas(itens, sprints, hoje).map((i) => i.id));
  const mapa = new Map<number, LinhaPrioridade>();
  for (const i of pendencias(itens)) {
    const [motivo, acao] = i.coluna === "Aguardando decisão" ? ["Aguardando decisão", "Decidir"]
      : i.coluna === "Impedido" ? ["Impedido", "Remover o impedimento"] : ["Dependência", "Resolver a dependência"];
    mapa.set(i.id, { ...i, motivo: atraso.has(i.id) ? `${motivo} e atrasada` : motivo, acao });
  }
  for (const i of atrasadas(itens, sprints, hoje))
    if (!mapa.has(i.id)) mapa.set(i.id, { ...i, motivo: i.prazo && i.prazo < hoje ? `Prazo venceu em ${fmtData(i.prazo)}` : "Sprint já encerrou", acao: "Replanejar ou concluir" });
  const peso = (l: LinhaPrioridade) => l.motivo.startsWith("Aguardando") ? 0 : l.motivo.startsWith("Impedido") ? 1 : 2;
  return [...mapa.values()].sort((a, b) => peso(a) - peso(b) || (b.diasSemAtualizar ?? 0) - (a.diasSemAtualizar ?? 0));
}
