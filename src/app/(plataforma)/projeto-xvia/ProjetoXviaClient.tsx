"use client";

import { useState } from "react";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import type { TfsContrato, TfsItem, TfsSprint, TfsStakeholder } from "@/lib/tfs";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { ModulosTab } from "./ModulosTab";
import { PendenciasTab } from "./PendenciasTab";
import { FiscalizacaoTab } from "./FiscalizacaoTab";
import { FinanceiroTab } from "./FinanceiroTab";
import { StakeholdersTab } from "./StakeholdersTab";

/** Acompanhamento do contrato X-VIA a partir do backlog do TFS — pedido do
 * Secretário Executivo. Sem filtro de período: é o retrato do backlog no dia
 * da extração. As abas seguem as seções do relatório (pendências e problemas,
 * fiscalização e aceite, execução financeira) mais módulos e stakeholders. */
export function ProjetoXviaClient({
  itens,
  sprints,
  contrato,
  stakeholders,
  hoje,
}: {
  itens: TfsItem[];
  sprints: TfsSprint[];
  contrato: TfsContrato | null;
  stakeholders: TfsStakeholder[];
  hoje: string;
}) {
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");
  const filtro = `Retrato do TFS em ${new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR")}`;

  const abas: TabItem[] = [
    { id: "visao-geral", label: "Visão geral", content: <VisaoGeralTab itens={itens} sprints={sprints} contrato={contrato} hoje={hoje} onIrPara={setAbaAtiva} /> },
    { id: "modulos", label: "Módulos e frentes", content: <ModulosTab itens={itens} /> },
    { id: "pendencias", label: "Pendências e problemas", content: <PendenciasTab itens={itens} /> },
    { id: "fiscalizacao", label: "Fiscalização e aceite", content: <FiscalizacaoTab itens={itens} sprints={sprints} hoje={hoje} /> },
    { id: "financeiro", label: "Execução financeira", content: <FinanceiroTab itens={itens} sprints={sprints} contrato={contrato} /> },
    { id: "stakeholders", label: "Órgãos e pontos focais", content: <StakeholdersTab itens={itens} stakeholders={stakeholders} /> },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Projeto X-VIA">
        <ExportarRelatorioButton secoes={abas.map((a) => ({ id: a.id, label: a.label }))} ativaId={abaAtiva} filtro={filtro} />
      </ContentTopBar>
      <main className="flex-1 p-4 md:p-6 min-w-0">
        <RelatorioCapa titulo="Projeto X-VIA" filtro={filtro} />
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
