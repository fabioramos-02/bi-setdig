"use client";

import { useState } from "react";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { FuncionalidadesTab } from "./FuncionalidadesTab";
import { PerfilTab } from "./PerfilTab";
import { JornadaTab } from "./JornadaTab";
import { calcularInsightPlataforma, calcularInsightServico, calcularInsightFunil } from "@/lib/insights";
import type { GA4Overview, Plataforma, Servico, EventoFunil, HorarioGa4 } from "@/lib/data";

/** Sem PeriodoProvider — snapshot fixo de 30 dias (ver run_ga4_perfil() em
 * data-platform/run.py). Ver plano de implementação sobre a decisão de
 * escopo: paridade de filtro dia/semana/mês/ano com o Portal MS fica pra
 * quando/se pedirem. */
export function MsDigitalClient({
  visaoGeral,
  plataforma,
  servicos,
  funil,
  horarios,
}: {
  visaoGeral: GA4Overview[];
  plataforma: Plataforma[];
  servicos: Servico[];
  funil: EventoFunil[];
  horarios: HorarioGa4[];
}) {
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const totalUsers = visaoGeral.reduce((acc, r) => acc + r.activeUsers, 0);
  const totalSessions = visaoGeral.reduce((acc, r) => acc + r.sessions, 0);
  const totalViews = visaoGeral.reduce((acc, r) => acc + r.screenPageViews, 0);
  const novos = visaoGeral.find((r) => r.newVsReturning === "new")?.activeUsers ?? 0;
  const recorrentes = visaoGeral.find((r) => r.newVsReturning === "returning")?.activeUsers ?? 0;

  const insightPlataforma = calcularInsightPlataforma(plataforma);
  const insightServico = calcularInsightServico(servicos);
  const insightFunil = calcularInsightFunil(funil);

  const abas: TabItem[] = [
    {
      id: "visao-geral",
      label: "1. Visão Geral",
      content: (
        <VisaoGeralTab
          totalUsers={totalUsers}
          totalSessions={totalSessions}
          totalViews={totalViews}
          novos={novos}
          recorrentes={recorrentes}
          insightPlataforma={insightPlataforma}
          insightServico={insightServico}
          onIrPara={setAbaAtiva}
        />
      ),
    },
    {
      id: "funcionalidades",
      label: "2. Funcionalidades",
      content: <FuncionalidadesTab servicos={servicos} insightServico={insightServico} />,
    },
    {
      id: "perfil",
      label: "3. Perfil Técnico",
      content: <PerfilTab plataforma={plataforma} horarios={horarios} insightPlataforma={insightPlataforma} />,
    },
    {
      id: "jornada",
      label: "4. Jornada do Usuário",
      content: <JornadaTab funil={funil} insightFunil={insightFunil} />,
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Analytics — MS Digital">
        <ExportPdfButton />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
