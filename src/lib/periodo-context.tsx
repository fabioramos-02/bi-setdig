"use client";

import { createContext, useContext, useState } from "react";
import type { PeriodoState } from "@/lib/period-filter";

type PeriodoCtx = {
  estado: PeriodoState;
  setEstado: (novo: PeriodoState) => void;
  min: string;
  max: string;
};

const Ctx = createContext<PeriodoCtx | null>(null);

/**
 * Estado do filtro de período compartilhado entre a Sidebar (onde os
 * controles vivem) e o conteúdo da página (onde os gráficos consomem).
 * Provider no layout (plataforma) — envolve Sidebar + conteúdo, os dois
 * são irmãos e precisam do mesmo estado. min/max vêm da série diária,
 * lidos no layout (server) e passados pra cá.
 */
export function PeriodoProvider({ min, max, children }: { min: string; max: string; children: React.ReactNode }) {
  const [estado, setEstado] = useState<PeriodoState>({ tipo: "mes", dataRef: max });
  return <Ctx.Provider value={{ estado, setEstado, min, max }}>{children}</Ctx.Provider>;
}

export function usePeriodo(): PeriodoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePeriodo precisa estar dentro de <PeriodoProvider>");
  return ctx;
}
