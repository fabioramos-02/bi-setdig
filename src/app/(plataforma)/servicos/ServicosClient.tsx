"use client";

import { useState } from "react";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { PorOrgaoTab } from "./PorOrgaoTab";
import { PorCategoriaTab } from "./PorCategoriaTab";
import { JornadaTab } from "./JornadaTab";
import { RelacaoTab } from "./RelacaoTab";
import type { InventarioResumo, InventarioOrgao, InventarioCategoria, CartaRelacao, JornadaResumo } from "@/lib/data";

export function ServicosClient({
  resumo,
  orgaos,
  categorias,
  relacao,
  jornada,
}: {
  resumo: InventarioResumo;
  orgaos: InventarioOrgao[];
  categorias: InventarioCategoria[];
  relacao: CartaRelacao[];
  jornada: JornadaResumo | null;
}) {
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const abas: TabItem[] = [
    { id: "visao-geral", label: "1. Visão Geral", content: <VisaoGeralTab resumo={resumo} /> },
    { id: "por-orgao", label: "2. Por Órgão", content: <PorOrgaoTab orgaos={orgaos} /> },
    { id: "por-categoria", label: "3. Por Categoria", content: <PorCategoriaTab categorias={categorias} /> },
    { id: "jornada", label: "4. Jornada", content: <JornadaTab jornada={jornada} /> },
    { id: "relacao", label: "5. Relação de Cartas", content: <RelacaoTab cartas={relacao} /> },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Serviços">
        <ExportPdfButton />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
