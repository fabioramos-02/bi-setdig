"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { filtrarItens, type EtpUst, type Filtros, type TfsContrato, type TfsItem, type TfsSprint, type TfsStakeholder } from "@/lib/tfs";
import { FiltrosBar, descreverFiltros } from "./FiltrosBar";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { ModulosTab } from "./ModulosTab";
import { PendenciasTab } from "./PendenciasTab";
import { FiscalizacaoTab } from "./FiscalizacaoTab";
import { UstTab } from "./UstTab";
import { StakeholdersTab } from "./StakeholdersTab";

export type Filtrar = (campo: keyof Filtros, valor: string) => void;

/** Acompanhamento do contrato X-VIA a partir do backlog do TFS — pedido do
 * Secretário Executivo. Sem filtro de período: retrato do backlog no dia da
 * extração. Os filtros (módulo, frente, órgão, sprint) ficam na URL e valem
 * para todas as abas; clicar numa barra ou linha aplica o filtro. */
export function ProjetoXviaClient({
  itens,
  sprints,
  contrato,
  etp,
  stakeholders,
  hoje,
}: {
  itens: TfsItem[];
  sprints: TfsSprint[];
  contrato: TfsContrato | null;
  etp: EtpUst | null;
  stakeholders: TfsStakeholder[];
  hoje: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const filtros: Filtros = {
    modulo: params.get("modulo") ?? "",
    frente: params.get("frente") ?? "",
    orgao: params.get("orgao") ?? "",
    sprint: params.get("sprint") ?? "",
  };
  const filtrar: Filtrar = (campo, valor) => {
    const novo = new URLSearchParams(params.toString());
    if (valor && valor !== filtros[campo]) novo.set(campo, valor);
    else novo.delete(campo); // clicar de novo no mesmo item limpa o filtro
    router.replace(`${pathname}${novo.size ? `?${novo}` : ""}`, { scroll: false });
  };
  const limpar = () => router.replace(pathname, { scroll: false });

  const recorte = filtrarItens(itens, filtros);
  const dataRetrato = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR");
  const filtroRelatorio = `${descreverFiltros(filtros) || "Projeto inteiro"} · retrato do TFS em ${dataRetrato}`;

  const abas: TabItem[] = [
    { id: "visao-geral", label: "Visão geral", content: <VisaoGeralTab itens={recorte} sprints={sprints} contrato={contrato} etp={etp} hoje={hoje} onIrPara={setAbaAtiva} /> },
    { id: "modulos", label: "Módulos e frentes", content: <ModulosTab itens={recorte} filtros={filtros} filtrar={filtrar} /> },
    { id: "pendencias", label: "Pendências e problemas", content: <PendenciasTab itens={recorte} filtros={filtros} filtrar={filtrar} /> },
    { id: "fiscalizacao", label: "Fiscalização e aceite", content: <FiscalizacaoTab itens={recorte} sprints={sprints} hoje={hoje} /> },
    { id: "ust", label: "UST da X-VIA × ETP", content: <UstTab itens={recorte} etp={etp} contrato={contrato} /> },
    { id: "orgaos", label: "Órgãos e pontos focais", content: <StakeholdersTab itens={recorte} stakeholders={stakeholders} filtros={filtros} filtrar={filtrar} /> },
  ];

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <ContentTopBar title="Projeto X-VIA">
        <ExportarRelatorioButton secoes={abas.map((a) => ({ id: a.id, label: a.label }))} ativaId={abaAtiva} filtro={filtroRelatorio} />
      </ContentTopBar>
      <main className="flex-1 p-4 md:p-6 min-w-0">
        <RelatorioCapa titulo="Projeto X-VIA" filtro={filtroRelatorio} />
        <FiltrosBar itens={itens} filtros={filtros} filtrar={filtrar} limpar={limpar} total={recorte.length} dataRetrato={dataRetrato} />
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
