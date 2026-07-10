"use client";

import { useMemo, useState } from "react";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { PerfilCidadaoTab } from "./PerfilCidadaoTab";
import { ServicosPorPerfilTab } from "./ServicosPorPerfilTab";
import { FluxoNavegacaoTab } from "./FluxoNavegacaoTab";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { BuscaTab } from "./BuscaTab";
import { PaginasTab } from "./PaginasTab";
import { aplicarFiltroPeriodo, chavePeriodoFixo, resumoDoPeriodo } from "@/lib/period-filter";
import { usePeriodo } from "@/lib/periodo-context";
import {
  calcularInsightBusca,
  calcularInsightPagina,
  calcularInsightVisitas,
  calcularInsightNavegador,
  calcularInsightDispositivo,
} from "@/lib/insights";
import type {
  VisitaDiaria,
  BreakdownPorPeriodo,
  PeriodoFixo,
  Cidade,
  Navegador,
  Dispositivo,
  Horario,
  Pagina,
  TermoBusca,
  PerfilFiltroPeriodo,
  ServicoAcessado,
  PaginaEntrada,
  DominioSaida,
} from "@/lib/data";

const ROTULO_PERIODO = { dia: "no dia", semana: "na semana", mes: "no mês", ano: "no ano", intervalo: "no intervalo" };

export function PortalMsClient({
  diarias,
  navegadores,
  dispositivos,
  horarios,
  cidades,
  paginas,
  busca,
  matchRate,
  perfil,
  servicosMaisAcessados,
  portasEntrada,
  fugaHub,
}: {
  diarias: VisitaDiaria[];
  navegadores: BreakdownPorPeriodo<Navegador>;
  dispositivos: BreakdownPorPeriodo<Dispositivo>;
  horarios: BreakdownPorPeriodo<Horario>;
  cidades: BreakdownPorPeriodo<Cidade>;
  paginas: BreakdownPorPeriodo<Pagina>;
  busca: BreakdownPorPeriodo<TermoBusca>;
  matchRate: number;
  perfil: Record<PeriodoFixo, PerfilFiltroPeriodo>;
  servicosMaisAcessados: BreakdownPorPeriodo<ServicoAcessado>;
  portasEntrada: BreakdownPorPeriodo<PaginaEntrada>;
  fugaHub: BreakdownPorPeriodo<DominioSaida>;
}) {
  // Estado do filtro vem da sidebar (PeriodoProvider) — mesmo estado, gráficos
  // reagem sem barra de filtro dentro do conteúdo.
  const { estado } = usePeriodo();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  // "Intervalo" não tem breakdown próprio (ver ADR-007) — cai no snapshot "mês".
  const periodoAtual: PeriodoFixo = chavePeriodoFixo(estado);
  const navegadoresAtual = navegadores[periodoAtual];
  const dispositivosAtual = dispositivos[periodoAtual];
  const horariosAtual = horarios[periodoAtual];
  const cidadesAtual = cidades[periodoAtual];
  const perfilAtual = perfil[periodoAtual];
  const servicosAcessadosAtual = servicosMaisAcessados[periodoAtual];
  const portasEntradaAtual = portasEntrada[periodoAtual];
  const fugaHubAtual = fugaHub[periodoAtual];
  const paginasAtual = paginas[periodoAtual];
  const buscaAtual = busca[periodoAtual];

  const tendencia = useMemo(() => aplicarFiltroPeriodo(diarias, estado), [diarias, estado]);
  const kpis = useMemo(() => resumoDoPeriodo(diarias, estado), [diarias, estado]);
  const insightBusca = calcularInsightBusca(buscaAtual);
  const insightPagina = calcularInsightPagina(paginasAtual);
  const insightVisitas = calcularInsightVisitas(tendencia, estado.tipo);
  const insightNavegador = calcularInsightNavegador(navegadoresAtual);
  const insightDispositivo = calcularInsightDispositivo(dispositivosAtual);
  const paginaTop = paginasAtual[0] ?? null;
  const rotuloPeriodo = ROTULO_PERIODO[estado.tipo];
  // Breakdowns de categoria (busca/páginas/navegadores/...) não têm recorte
  // próprio de intervalo (ADR-007) — o texto deles tem que dizer o período
  // que o dado REALMENTE é (periodoAtual), nunca o que o usuário escolheu.
  // Só KPIs/tendência (via série diária) usam rotuloPeriodo com segurança.
  const rotuloSnapshot = ROTULO_PERIODO[periodoAtual];
  const tipoIntervalo = estado.tipo === "intervalo";

  const abas: TabItem[] = [
    {
      id: "visao-geral",
      label: "1. Visão Geral",
      content: (
        <VisaoGeralTab
          kpis={kpis}
          rotuloPeriodo={rotuloPeriodo}
          cidadesCount={cidadesAtual.length}
          tendencia={tendencia}
          insightVisitas={insightVisitas}
          insightNavegador={insightNavegador}
          insightDispositivo={insightDispositivo}
          paginaTop={paginaTop}
          insightBusca={insightBusca}
          onIrPara={setAbaAtiva}
        />
      ),
    },
    {
      id: "perfil",
      label: "2. Perfil do Cidadão",
      content: (
        <PerfilCidadaoTab
          matchRate={matchRate}
          cidadesAtual={cidadesAtual}
          navegadoresAtual={navegadoresAtual}
          insightNavegador={insightNavegador}
          dispositivosAtual={dispositivosAtual}
          horariosAtual={horariosAtual}
          tipoIntervalo={tipoIntervalo}
        />
      ),
    },
    {
      id: "busca",
      label: "3. Intenção de Busca",
      content: (
        <BuscaTab busca={buscaAtual} rotuloPeriodo={rotuloSnapshot} insightBusca={insightBusca} tipoIntervalo={tipoIntervalo} />
      ),
    },
    {
      id: "paginas",
      label: "4. Páginas mais acessadas",
      content: (
        <PaginasTab
          paginas={paginasAtual}
          rotuloPeriodo={rotuloSnapshot}
          insightPagina={insightPagina}
          tipoIntervalo={tipoIntervalo}
        />
      ),
    },
    {
      id: "servicos",
      label: "5. Serviços por Perfil",
      content: (
        <ServicosPorPerfilTab
          dados={perfilAtual}
          servicosMaisAcessados={servicosAcessadosAtual}
          tipoIntervalo={tipoIntervalo}
        />
      ),
    },
    {
      id: "jornada",
      label: "6. Fluxo de Navegação",
      content: (
        <FluxoNavegacaoTab portasEntrada={portasEntradaAtual} fugaHub={fugaHubAtual} tipoIntervalo={tipoIntervalo} />
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Analytics — Portal MS">
        <ExportPdfButton />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
