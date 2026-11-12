export type NivelProjeto = "secretario" | "gerente" | "detalhe";
export type AbaProjeto = "relatorio" | "prioridades" | "cronograma" | "modulos" | "financeiro" | "fiscalizacao" | "ust" | "registros" | "entregas" | "orgaos" | "equipes" | "qualidade";
export type DestinoProjeto = { nivel: NivelProjeto; aba: AbaProjeto; alvo?: string };
export type NavegarProjeto = (destino: DestinoProjeto) => void;

const DETALHE = new Set(["ust", "registros", "entregas", "orgaos", "equipes", "qualidade"]);
export function destinoDaAba(aba: string): DestinoProjeto {
  if (DETALHE.has(aba)) return { nivel: "detalhe", aba: aba as AbaProjeto };
  if (["prioridades", "cronograma", "modulos", "financeiro", "fiscalizacao"].includes(aba)) return { nivel: "gerente", aba: aba as AbaProjeto };
  return { nivel: "secretario", aba: "relatorio" };
}
