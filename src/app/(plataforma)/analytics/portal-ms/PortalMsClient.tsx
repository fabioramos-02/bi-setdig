"use client";

import { useEffect, useMemo, useState } from "react";
import type { StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { PerfilCidadaoTab } from "./PerfilCidadaoTab";
import { ServicosPorPerfilTab } from "./ServicosPorPerfilTab";
import { FluxoNavegacaoTab } from "./FluxoNavegacaoTab";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { BuscaTab } from "./BuscaTab";
import { PaginasTab } from "./PaginasTab";
import { aplicarFiltroPeriodo, chavePeriodoFixo, resumoDoPeriodo, intervaloDoBucket, ehPeriodoCorrente, rotuloPeriodoResolvido } from "@/lib/period-filter";
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

// Shape devolvido por /api/analytics/portal-ms (ADR-010) — mesmos tipos do
// dataset estático, só que calculado ao vivo pro intervalo exato escolhido.
type LiveIntervalo = {
  navegadores: Navegador[];
  dispositivos: Dispositivo[];
  horarios: Horario[];
  geografia: Cidade[];
  paginas: Pagina[];
  busca: TermoBusca[];
  portasEntrada: PaginaEntrada[];
  fugaHub: DominioSaida[];
  perfil: PerfilFiltroPeriodo;
  servicosMaisAcessados: ServicoAcessado[];
};

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
  const { estado, min, max } = usePeriodo();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const periodoAtual: PeriodoFixo = chavePeriodoFixo(estado);
  const tipoIntervalo = estado.tipo === "intervalo";

  // Busca ao vivo (ADR-010, Matomo period=range) sempre que o período escolhido
  // NÃO é o corrente: intervalo, ou um dia/semana/mês/ano passado apontado pela
  // data de referência. O período corrente já tem snapshot publicado (grátis).
  // Assim a "Data de referência" move TODOS os gráficos, não só os KPIs.
  const precisaLive = tipoIntervalo ? Boolean(estado.inicio && estado.fim) : !ehPeriodoCorrente(estado, min, max);
  const range = intervaloDoBucket(estado, min, max);

  const [liveData, setLiveData] = useState<LiveIntervalo | null>(null);
  // Range que gerou o liveData atual — sem isso, trocar de um período passado
  // pra OUTRO período passado (ex. jan→fev) mantinha o liveData antigo "válido"
  // enquanto o novo fetch carregava: nem mostrava loading, nem tava certo (ficava
  // de fato mostrando o dado de janeiro rotulado como fevereiro por um instante).
  const [liveRange, setLiveRange] = useState<{ inicio: string; fim: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "carregando" | "erro">("idle");

  useEffect(() => {
    // No período corrente liveData/liveStatus não são lidos (statusBreakdown cai
    // em "ok" e todo *Atual é guardado por precisaLive) — não precisa resetar
    // estado aqui (evita setState síncrono no corpo do efeito).
    if (!precisaLive) return;
    let cancelado = false;
    fetch(`/api/analytics/portal-ms?inicio=${range.inicio}&fim=${range.fim}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LiveIntervalo>;
      })
      .then((data) => {
        if (cancelado) return;
        setLiveData(data);
        setLiveRange({ inicio: range.inicio, fim: range.fim });
        setLiveStatus("idle");
      })
      .catch(() => {
        if (cancelado) return;
        setLiveStatus("erro");
      });
    return () => {
      cancelado = true;
    };
  }, [precisaLive, range.inicio, range.fim]);

  // Só usa liveData se ele foi buscado PRA ESTE range exato — enquanto o fetch
  // do range novo não resolve, cai no "carregando" (nunca mostra dado de outro
  // período rotulado como se fosse deste).
  const liveValido = liveData !== null && liveRange?.inicio === range.inicio && liveRange?.fim === range.fim;

  // status pros painéis ao vivo — "ok" quando o dado real chegou (ou período
  // corrente); "carregando" é derivado (default enquanto não chegou nem falhou).
  const statusBreakdown: StatusIntervalo = !precisaLive ? "ok" : liveValido ? "ok" : liveStatus === "erro" ? "fallback" : "carregando";

  const navegadoresAtual = precisaLive && liveValido ? liveData!.navegadores : navegadores[periodoAtual];
  const dispositivosAtual = precisaLive && liveValido ? liveData!.dispositivos : dispositivos[periodoAtual];
  const horariosAtual = precisaLive && liveValido ? liveData!.horarios : horarios[periodoAtual];
  const cidadesAtual = precisaLive && liveValido ? liveData!.geografia : cidades[periodoAtual];
  const paginasAtual = precisaLive && liveValido ? liveData!.paginas : paginas[periodoAtual];
  const buscaAtual = precisaLive && liveValido ? liveData!.busca : busca[periodoAtual];
  const portasEntradaAtual = precisaLive && liveValido ? liveData!.portasEntrada : portasEntrada[periodoAtual];
  const fugaHubAtual = precisaLive && liveValido ? liveData!.fugaHub : fugaHub[periodoAtual];
  // Perfil/serviços também ao vivo: catálogo estável vem do snapshot mês, só as
  // visitas são recalculadas na rota (ver lib/server/perfil-live.ts).
  const perfilAtual = precisaLive && liveValido ? liveData!.perfil : perfil[periodoAtual];
  const servicosAcessadosAtual = precisaLive && liveValido ? liveData!.servicosMaisAcessados : servicosMaisAcessados[periodoAtual];

  const tendencia = useMemo(() => aplicarFiltroPeriodo(diarias, estado), [diarias, estado]);
  const kpis = useMemo(() => resumoDoPeriodo(diarias, estado), [diarias, estado]);
  const insightBusca = calcularInsightBusca(buscaAtual);
  const insightPagina = calcularInsightPagina(paginasAtual);
  const insightVisitas = calcularInsightVisitas(tendencia, estado.tipo);
  const insightNavegador = calcularInsightNavegador(navegadoresAtual);
  const insightDispositivo = calcularInsightDispositivo(dispositivosAtual);
  const paginaTop = paginasAtual[0] ?? null;
  const rotuloPeriodo = ROTULO_PERIODO[estado.tipo];
  // Breakdowns de categoria só podem usar o rótulo que o usuário escolheu
  // ("no intervalo") quando o dado é mesmo ao vivo pro intervalo (liveData) —
  // caso contrário é snapshot e o texto tem que dizer o período REAL
  // (periodoAtual), nunca o que foi selecionado (ver AGENTS.md/ADR-007).
  const rotuloSnapshot = tipoIntervalo && liveValido ? rotuloPeriodo : ROTULO_PERIODO[periodoAtual];

  const abas: TabItem[] = [
    {
      id: "visao-geral",
      label: "1. Visão Geral",
      content: (
        <VisaoGeralTab
          kpis={kpis}
          rotuloPeriodo={rotuloPeriodo}
          rotuloSnapshot={rotuloSnapshot}
          cidadesCount={cidadesAtual.length}
          tendencia={tendencia}
          insightVisitas={insightVisitas}
          insightNavegador={insightNavegador}
          insightDispositivo={insightDispositivo}
          paginaTop={paginaTop}
          insightBusca={insightBusca}
          status={statusBreakdown}
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
          status={statusBreakdown}
        />
      ),
    },
    {
      id: "busca",
      label: "3. Intenção de Busca",
      content: (
        <BuscaTab busca={buscaAtual} rotuloPeriodo={rotuloSnapshot} insightBusca={insightBusca} status={statusBreakdown} />
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
          status={statusBreakdown}
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
          status={statusBreakdown}
        />
      ),
    },
    {
      id: "jornada",
      label: "6. Fluxo de Navegação",
      content: (
        <FluxoNavegacaoTab portasEntrada={portasEntradaAtual} fugaHub={fugaHubAtual} status={statusBreakdown} />
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Portal Único">
        <ExportarRelatorioButton secoes={abas.map((a) => ({ id: a.id, label: a.label }))} ativaId={abaAtiva} filtro={rotuloPeriodoResolvido(estado) || "período atual"} />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <RelatorioCapa titulo="Portal Único" filtro={rotuloPeriodoResolvido(estado) || "período atual"} />
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
