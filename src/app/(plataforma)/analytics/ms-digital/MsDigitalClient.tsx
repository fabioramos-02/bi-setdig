"use client";

import { useEffect, useState } from "react";
import type { StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
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
  calcularInsightCategoria,
  calcularInsightFunil,
  calcularInsightHorario,
} from "@/lib/insights";
import { classificarAcessosApp } from "@/lib/servico-app-classifier";
import { compararCanais } from "@/lib/cross-canal";
import { usePeriodo } from "@/lib/periodo-context";
import { chavePeriodoFixo, resumoDoPeriodo, intervaloDoBucket, ehPeriodoCorrente } from "@/lib/period-filter";
import type {
  BreakdownPorPeriodo,
  GA4Overview,
  Plataforma,
  Servico,
  EventoFunil,
  HorarioGa4,
  VisitaDiaria,
  Dispositivo,
  ServicoAcessado,
  ServicoCatalogo,
} from "@/lib/data";
import type { ResumoCatalogo, CategoriaResumo } from "@/lib/catalogo-app";

const ROTULO_PERIODO = { dia: "no dia", semana: "na semana", mes: "no mês", ano: "no ano", intervalo: "no intervalo" };

// Shape devolvido por /api/analytics/ms-digital (ADR-010).
type LiveIntervalo = {
  visaoGeral: GA4Overview[];
  plataforma: Plataforma[];
  servicos: Servico[];
  funil: EventoFunil[];
  horarios: HorarioGa4[];
};

/** MS Digital agora reage ao filtro de período (GA4 v2 = breakdown por período,
 * ver run.py::GA4_PERIODOS). O PeriodoProvider já envolve o layout; aqui só
 * consumimos usePeriodo() e lemos a chave certa de cada breakdown. Em
 * "Intervalo", tenta buscar ao vivo (ADR-010); CrossCanalTab/Perfil continuam
 * no fallback (dependem do estudo Matomo de perfil, não portado ainda). */
export function MsDigitalClient({
  visaoGeral,
  plataforma,
  servicos,
  funil,
  horarios,
  portalDiarias,
  portalDispositivos,
  portalServicosMaisAcessados,
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
  portalServicosMaisAcessados: BreakdownPorPeriodo<ServicoAcessado>;
  catalogo: ServicoCatalogo[];
  catalogoResumo: ResumoCatalogo;
  catalogoCategorias: CategoriaResumo[];
}) {
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");
  const { estado, min, max } = usePeriodo();
  const periodo = chavePeriodoFixo(estado);
  const tipoIntervalo = estado.tipo === "intervalo";

  // Busca ao vivo sempre que o período escolhido não é o corrente (intervalo ou
  // dia/semana/mês/ano passado apontado pela data de referência). Assim a data
  // de referência move os gráficos GA4, não só os KPIs. (ver PortalMsClient.)
  const precisaLive = tipoIntervalo ? Boolean(estado.inicio && estado.fim) : !ehPeriodoCorrente(estado, min, max);
  const range = intervaloDoBucket(estado, min, max);

  const [liveData, setLiveData] = useState<LiveIntervalo | null>(null);
  // Range que gerou o liveData atual — sem isso, trocar de um período passado
  // pra OUTRO período passado (ex. jan→fev) mantinha o liveData antigo "válido"
  // enquanto o novo fetch carregava (nunca mostrava loading, e por um instante
  // mostrava o dado do período errado rotulado como se fosse o novo).
  const [liveRange, setLiveRange] = useState<{ inicio: string; fim: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "carregando" | "erro">("idle");

  useEffect(() => {
    // No período corrente liveData/liveStatus não são lidos (statusGa4 cai em
    // "ok" e todo vg/plat/serv/... é guardado por precisaLive) — não precisa
    // resetar estado aqui (evita setState síncrono no corpo do efeito).
    if (!precisaLive) return;
    let cancelado = false;
    fetch(`/api/analytics/ms-digital?inicio=${range.inicio}&fim=${range.fim}`)
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

  // Só usa liveData se ele foi buscado PRA ESTE range exato.
  const liveValido = liveData !== null && liveRange?.inicio === range.inicio && liveRange?.fim === range.fim;

  // "carregando" é derivado (default enquanto o dado ao vivo não chegou nem falhou).
  const statusGa4: StatusIntervalo = !precisaLive ? "ok" : liveValido ? "ok" : liveStatus === "erro" ? "fallback" : "carregando";

  // Rótulo do período REAL do dado: "no intervalo" só quando é intervalo com live;
  // senão o período fixo selecionado (mês/dia/… — inclusive passado, via live).
  const rotuloPeriodo = tipoIntervalo && liveValido ? ROTULO_PERIODO.intervalo : ROTULO_PERIODO[periodo];

  // Fatia de cada breakdown no período selecionado (ou dado ao vivo, se disponível).
  const vg = precisaLive && liveValido ? liveData!.visaoGeral : visaoGeral[periodo];
  const plat = precisaLive && liveValido ? liveData!.plataforma : plataforma[periodo];
  const serv = precisaLive && liveValido ? liveData!.servicos : servicos[periodo];
  const fun = precisaLive && liveValido ? liveData!.funil : funil[periodo];
  const hor = precisaLive && liveValido ? liveData!.horarios : horarios[periodo];

  const totalUsers = vg.reduce((acc, r) => acc + r.activeUsers, 0);
  const totalSessions = vg.reduce((acc, r) => acc + r.sessions, 0);
  const totalViews = vg.reduce((acc, r) => acc + r.screenPageViews, 0);
  const novos = vg.find((r) => r.newVsReturning === "new")?.activeUsers ?? 0;
  const recorrentes = vg.find((r) => r.newVsReturning === "returning")?.activeUsers ?? 0;

  // GA4 registra screen_view igual pra categoria/submenu/serviço-folha — sem
  // isso, "serviço mais usado" mostrava categoria ("Servidor Público") em vez
  // de serviço real ("Contracheque"). Reclassifica contra o catálogo estático.
  const classificado = classificarAcessosApp(serv, catalogo);

  const insightPlataforma = calcularInsightPlataforma(plat);
  const insightServico = calcularInsightServico(classificado.servicosFolha);
  const insightCategoria = calcularInsightCategoria(classificado.categorias);
  const insightFunil = calcularInsightFunil(fun);
  const insightHorario = calcularInsightHorario(hor);

  // Cross-BI: mesmo período nos dois canais. Portal = únicos do bucket +
  // serviços mais acessados gerais (Matomo), app = GA4. Reconciliação em
  // lib/cross-canal (compara listas como conjuntos, não linha a linha).
  const comparacao = compararCanais({
    appVisaoGeral: vg,
    // Serviço-folha reclassificado (não a categoria crua do GA4) — mesmo dado do
    // ranking em Funcionalidades, pra comparar serviço real × serviço real.
    appServicos: classificado.servicosFolha,
    appPlataforma: plat,
    portalUniques: resumoDoPeriodo(portalDiarias, estado).visitantesUnicos,
    // Serviços/páginas mais acessados GERAIS do portal (não o subconjunto curado
    // do estudo de Perfil) — simétrico ao lado app. Snapshot (Matomo não vai ao
    // vivo nesta rota — mesma limitação do PBI-7).
    portalServicos: portalServicosMaisAcessados[periodo].map((s) => ({ servico: s.servico, visitas: s.visitas })),
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
          rotuloPeriodo={rotuloPeriodo}
          insightPlataforma={insightPlataforma}
          insightServico={insightServico}
          onIrPara={setAbaAtiva}
          status={statusGa4}
        />
      ),
    },
    {
      id: "funcionalidades",
      label: "2. Funcionalidades",
      content: (
        <FuncionalidadesTab
          servicosFolha={classificado.servicosFolha}
          categorias={classificado.categorias}
          naoIdentificadoPct={classificado.naoIdentificadoPct}
          insightServico={insightServico}
          insightCategoria={insightCategoria}
          status={statusGa4}
        />
      ),
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
          status={statusGa4}
        />
      ),
    },
    {
      id: "jornada",
      label: "4. Jornada do Usuário",
      content: <JornadaTab funil={fun} insightFunil={insightFunil} status={statusGa4} />,
    },
    {
      id: "app-portal",
      label: "5. App × Portal",
      content: <CrossCanalTab comparacao={comparacao} tipoIntervalo={precisaLive} />,
    },
    {
      id: "categorias",
      label: "6. Categorias do app",
      content: (
        <CategoriasTab
          servicos={catalogo}
          resumo={catalogoResumo}
          categorias={catalogoCategorias}
          acessosServico={classificado.servicosFolha}
          acessosCategoria={classificado.categorias}
          status={statusGa4}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="MS Digital">
        <ExportPdfButton />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
