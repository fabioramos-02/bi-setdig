"use client";

import { useState } from "react";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { FuncionalidadesTab } from "./FuncionalidadesTab";
import { PerfilTab } from "./PerfilTab";
import { JornadaTab } from "./JornadaTab";
import { CrossCanalTab } from "./CrossCanalTab";
import { CategoriasTab } from "./CategoriasTab";
import {
  calcularInsightPlataforma,
  calcularInsightServico,
  calcularInsightFunil,
  calcularInsightHorario,
} from "@/lib/insights";
import { compararCanais } from "@/lib/cross-canal";
import { usePeriodo } from "@/lib/periodo-context";
import { chavePeriodoFixo, resumoDoPeriodo } from "@/lib/period-filter";
import type {
  BreakdownPorPeriodo,
  GA4Overview,
  Plataforma,
  Servico,
  EventoFunil,
  HorarioGa4,
  VisitaDiaria,
  Dispositivo,
  PeriodoFixo,
  PerfilFiltroPeriodo,
  ServicoCatalogo,
} from "@/lib/data";
import type { ResumoCatalogo, CategoriaResumo } from "@/lib/catalogo-app";

/** MS Digital agora reage ao filtro de período (GA4 v2 = breakdown por período,
 * ver run.py::GA4_PERIODOS). O PeriodoProvider já envolve o layout; aqui só
 * consumimos usePeriodo() e lemos a chave certa de cada breakdown. */
export function MsDigitalClient({
  visaoGeral,
  plataforma,
  servicos,
  funil,
  horarios,
  portalDiarias,
  portalDispositivos,
  portalPerfil,
  catalogo,
  catalogoResumo,
  catalogoCategorias,
}: {
  visaoGeral: BreakdownPorPeriodo<GA4Overview>;
  plataforma: BreakdownPorPeriodo<Plataforma>;
  servicos: BreakdownPorPeriodo<Servico>;
  funil: BreakdownPorPeriodo<EventoFunil>;
  horarios: BreakdownPorPeriodo<HorarioGa4>;
  portalDiarias: VisitaDiaria[];
  portalDispositivos: BreakdownPorPeriodo<Dispositivo>;
  portalPerfil: Record<PeriodoFixo, PerfilFiltroPeriodo>;
  catalogo: ServicoCatalogo[];
  catalogoResumo: ResumoCatalogo;
  catalogoCategorias: CategoriaResumo[];
}) {
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");
  const { estado } = usePeriodo();
  const periodo = chavePeriodoFixo(estado);

  // Fatia de cada breakdown no período selecionado.
  const vg = visaoGeral[periodo];
  const plat = plataforma[periodo];
  const serv = servicos[periodo];
  const fun = funil[periodo];
  const hor = horarios[periodo];

  const totalUsers = vg.reduce((acc, r) => acc + r.activeUsers, 0);
  const totalSessions = vg.reduce((acc, r) => acc + r.sessions, 0);
  const totalViews = vg.reduce((acc, r) => acc + r.screenPageViews, 0);
  const novos = vg.find((r) => r.newVsReturning === "new")?.activeUsers ?? 0;
  const recorrentes = vg.find((r) => r.newVsReturning === "returning")?.activeUsers ?? 0;

  const insightPlataforma = calcularInsightPlataforma(plat);
  const insightServico = calcularInsightServico(serv);
  const insightFunil = calcularInsightFunil(fun);
  const insightHorario = calcularInsightHorario(hor);

  // Cross-BI: mesmo período nos dois canais. Portal = únicos do bucket + serviços
  // do estudo de Perfil (Matomo), app = GA4. Reconciliação em lib/cross-canal.
  const comparacao = compararCanais({
    appVisaoGeral: vg,
    appServicos: serv,
    appPlataforma: plat,
    portalUniques: resumoDoPeriodo(portalDiarias, estado).visitantesUnicos,
    portalServicos: portalPerfil[periodo].topServicos.map((s) => ({ servico: s.servico, visitas: s.visitas })),
    portalDispositivos: portalDispositivos[periodo],
  });

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
      content: <FuncionalidadesTab servicos={serv} insightServico={insightServico} />,
    },
    {
      id: "perfil",
      label: "3. Perfil Técnico",
      content: (
        <PerfilTab
          plataforma={plat}
          horarios={hor}
          insightPlataforma={insightPlataforma}
          insightHorario={insightHorario}
        />
      ),
    },
    {
      id: "jornada",
      label: "4. Jornada do Usuário",
      content: <JornadaTab funil={fun} insightFunil={insightFunil} />,
    },
    {
      id: "app-portal",
      label: "5. App × Portal",
      content: <CrossCanalTab comparacao={comparacao} />,
    },
    {
      id: "categorias",
      label: "6. Categorias do app",
      content: <CategoriasTab servicos={catalogo} resumo={catalogoResumo} categorias={catalogoCategorias} />,
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
