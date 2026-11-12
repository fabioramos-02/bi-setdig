import type { Filtros } from "./tfs.ts";
import type { AcaoGestao } from "./xvia-gestao-acoes.ts";

export type NivelProjeto = "secretario" | "gerente" | "detalhe";
export type AbaProjeto = "relatorio" | "prioridades" | "cronograma" | "modulos" | "financeiro" | "fiscalizacao" | "ust" | "registros" | "entregas" | "orgaos" | "equipes" | "qualidade";
export type DestinoProjeto = { nivel: NivelProjeto; aba: AbaProjeto; alvo?: string; filtros?: Partial<Filtros>; acao?: AcaoGestao | ""; grupo?: AcaoGestao | "" };
export type NavegarProjeto = (destino: DestinoProjeto) => void;

const DETALHE = new Set(["ust", "registros", "entregas", "orgaos", "equipes", "qualidade"]);
export function destinoDaAba(aba: string): DestinoProjeto {
  if (DETALHE.has(aba)) return { nivel: "detalhe", aba: aba as AbaProjeto };
  if (["prioridades", "cronograma", "modulos", "financeiro", "fiscalizacao"].includes(aba)) return { nivel: "gerente", aba: aba as AbaProjeto };
  return { nivel: "secretario", aba: "relatorio" };
}

const PADRAO: Record<NivelProjeto, AbaProjeto> = { secretario: "relatorio", gerente: "prioridades", detalhe: "ust" };
export function lerNavegacao(params: Pick<URLSearchParams, "get">): DestinoProjeto {
  const nivelInformado = params.get("visao"), abaInformada = params.get("aba");
  const destino = destinoDaAba(abaInformada ?? "relatorio");
  const nivel: NivelProjeto = nivelInformado === "gerente" || nivelInformado === "detalhe" || nivelInformado === "secretario" ? nivelInformado : destino.nivel;
  return { nivel, aba: destino.nivel === nivel && abaInformada === destino.aba ? destino.aba : PADRAO[nivel] };
}
export function enderecoDoDestino(pathname: string, params: { toString(): string }, destino: DestinoProjeto) {
  const novo = new URLSearchParams(params.toString());
  novo.set("visao", destino.nivel); novo.set("aba", destino.aba);
  if (destino.aba === "entregas" && destino.acao) novo.set("acao", destino.acao); else novo.delete("acao");
  if (destino.aba === "prioridades" && destino.grupo) novo.set("grupo", destino.grupo); else novo.delete("grupo");
  for (const [campo, valor] of Object.entries(destino.filtros ?? {})) { if (valor) novo.set(campo, valor); else novo.delete(campo); }
  return `${pathname}?${novo}`;
}

/** Limpar os filtros não deve abandonar a área de trabalho atual. */
export function enderecoSemFiltros(pathname: string, params: { toString(): string }) {
  const novo = new URLSearchParams(params.toString());
  for (const campo of ["modulo", "frente", "orgao", "sprint"]) novo.delete(campo);
  return `${pathname}${novo.size ? `?${novo}` : ""}`;
}
