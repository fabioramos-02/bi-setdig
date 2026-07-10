"use client";

import { useEffect, useMemo, useState } from "react";
import type { StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
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
  const { estado } = usePeriodo();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  // "Intervalo": tenta buscar ao vivo (ADR-010, Matomo period=range); enquanto
  // carrega ou se falhar, cai no snapshot "mês" (ADR-007) — chavePeriodoFixo.
  const periodoAtual: PeriodoFixo = chavePeriodoFixo(estado);
  const tipoIntervalo = estado.tipo === "intervalo";

  const [liveData, setLiveData] = useState<LiveIntervalo | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "carregando" | "erro">("idle");

  useEffect(() => {
    if (!tipoIntervalo || !estado.inicio || !estado.fim) {
      setLiveData(null);
      setLiveStatus("idle");
      return;
    }
    let cancelado = false;
    setLiveStatus("carregando");
    fetch(`/api/analytics/portal-ms?inicio=${estado.inicio}&fim=${estado.fim}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LiveIntervalo>;
      })
      .then((data) => {
        if (cancelado) return;
        setLiveData(data);
        setLiveStatus("idle");
      })
      .catch(() => {
        if (cancelado) return;
        setLiveData(null);
        setLiveStatus("erro");
      });
    return () => {
      cancelado = true;
    };
  }, [tipoIntervalo, estado.inicio, estado.fim]);

  // status pros painéis com busca ao vivo — "ok" quando o dado real chegou.
  const statusBreakdown: StatusIntervalo = !tipoIntervalo ? "ok" : liveData ? "ok" : liveStatus === "carregando" ? "carregando" : "fallback";

  const navegadoresAtual = tipoIntervalo && liveData ? liveData.navegadores : navegadores[periodoAtual];
  const dispositivosAtual = tipoIntervalo && liveData ? liveData.dispositivos : dispositivos[periodoAtual];
  const horariosAtual = tipoIntervalo && liveData ? liveData.horarios : horarios[periodoAtual];
  const cidadesAtual = tipoIntervalo && liveData ? liveData.geografia : cidades[periodoAtual];
  const paginasAtual = tipoIntervalo && liveData ? liveData.paginas : paginas[periodoAtual];
  const buscaAtual = tipoIntervalo && liveData ? liveData.busca : busca[periodoAtual];
  const portasEntradaAtual = tipoIntervalo && liveData ? liveData.portasEntrada : portasEntrada[periodoAtual];
  const fugaHubAtual = tipoIntervalo && liveData ? liveData.fugaHub : fugaHub[periodoAtual];
  // Sem busca ao vivo ainda pra este estudo (transform/perfil.py é mais
  // complexo) — continua no snapshot + aviso legado (tipoIntervalo boolean).
  const perfilAtual = perfil[periodoAtual];
  const servicosAcessadosAtual = servicosMaisAcessados[periodoAtual];

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
  const rotuloSnapshot = tipoIntervalo && liveData ? rotuloPeriodo : ROTULO_PERIODO[periodoAtual];

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
          tipoIntervalo={tipoIntervalo}
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
      <ContentTopBar title="Analytics — Portal MS">
        <ExportPdfButton />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
