"use client";

import { useEffect, useState } from "react";
import type { StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { PerfilCidadaoTab } from "./PerfilCidadaoTab";
import { BuscaTab } from "./BuscaTab";
import { PaginasTab } from "./PaginasTab";
import { usePeriodo } from "@/lib/periodo-context";
import { intervaloDoBucket, rotuloPeriodoResolvido } from "@/lib/period-filter";
import {
  calcularInsightNavegador,
  calcularInsightDispositivo,
  calcularInsightPagina,
  calcularInsightBusca,
} from "@/lib/insights";
import type { Site, VisitaDiaria, Pagina, Navegador, Dispositivo, Horario, Cidade, TermoBusca } from "@/lib/data";

const ROTULO_PERIODO = { dia: "no dia", semana: "na semana", mes: "no mês", ano: "no ano", intervalo: "no intervalo" };

// Shape devolvido por /api/analytics/sites/[idsite] — sempre ao vivo, não
// existe dataset estático pra nenhum dos sites do catálogo.
type SiteLive = {
  tendencia: VisitaDiaria[];
  paginas: Pagina[];
  navegadores: Navegador[];
  dispositivos: Dispositivo[];
  horarios: Horario[];
  geografia: Cidade[];
  matchRateMapa: number;
  busca: TermoBusca[];
};

export function SiteDetailClient({ site }: { site: Site }) {
  const { estado, min, max } = usePeriodo();
  const range = intervaloDoBucket(estado, min, max);
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const [dados, setDados] = useState<SiteLive | null>(null);
  const [dadosRange, setDadosRange] = useState<{ inicio: string; fim: string } | null>(null);
  // "carregando" é o default enquanto o dado ao vivo não chegou nem falhou
  // (mesmo padrão de PortalMsClient — sem resetar estado síncrono no efeito).
  const [status, setStatus] = useState<"idle" | "carregando" | "erro">("carregando");

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/analytics/sites/${site.idsite}?inicio=${range.inicio}&fim=${range.fim}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SiteLive>;
      })
      .then((data) => {
        if (cancelado) return;
        setDados(data);
        setDadosRange({ inicio: range.inicio, fim: range.fim });
        setStatus("idle");
      })
      .catch(() => {
        if (cancelado) return;
        setStatus("erro");
      });
    return () => {
      cancelado = true;
    };
  }, [site.idsite, range.inicio, range.fim]);

  const valido = dados !== null && dadosRange?.inicio === range.inicio && dadosRange?.fim === range.fim;
  const statusChart: StatusIntervalo = valido ? "ok" : status === "erro" ? "fallback" : "carregando";
  const rotuloPeriodo = ROTULO_PERIODO[estado.tipo];

  const tendencia = dados?.tendencia ?? [];
  const paginas = dados?.paginas ?? [];
  const navegadores = dados?.navegadores ?? [];
  const dispositivos = dados?.dispositivos ?? [];
  const horarios = dados?.horarios ?? [];
  const cidades = dados?.geografia ?? [];
  const busca = dados?.busca ?? [];

  const insightNavegador = calcularInsightNavegador(navegadores);
  const insightDispositivo = calcularInsightDispositivo(dispositivos);
  const insightPagina = calcularInsightPagina(paginas);
  const insightBusca = calcularInsightBusca(busca);

  const abas: TabItem[] = [
    {
      id: "visao-geral",
      label: "1. Visão Geral",
      content: (
        <VisaoGeralTab
          tendencia={tendencia}
          rotuloPeriodo={rotuloPeriodo}
          insightNavegador={insightNavegador}
          insightDispositivo={insightDispositivo}
          insightPagina={insightPagina}
          insightBusca={insightBusca}
          status={statusChart}
          onIrPara={setAbaAtiva}
        />
      ),
    },
    {
      id: "perfil",
      label: "2. Perfil do Cidadão",
      content: (
        <PerfilCidadaoTab
          matchRate={dados?.matchRateMapa ?? 0}
          cidadesAtual={cidades}
          navegadoresAtual={navegadores}
          insightNavegador={insightNavegador}
          dispositivosAtual={dispositivos}
          horariosAtual={horarios}
          status={statusChart}
        />
      ),
    },
    {
      id: "busca",
      label: "3. Intenção de Busca",
      content: <BuscaTab busca={busca} rotuloPeriodo={rotuloPeriodo} insightBusca={insightBusca} status={statusChart} />,
    },
    {
      id: "paginas",
      label: "4. Páginas mais acessadas",
      content: (
        <PaginasTab paginas={paginas} rotuloPeriodo={rotuloPeriodo} insightPagina={insightPagina} status={statusChart} />
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title={site.nome}>
        <ExportarRelatorioButton secoes={abas.map((a) => ({ id: a.id, label: a.label }))} ativaId={abaAtiva} filtro={rotuloPeriodoResolvido(estado) || "período atual"} />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-6">
        <RelatorioCapa titulo={`Site — ${site.nome}`} filtro={rotuloPeriodoResolvido(estado) || "período atual"} />
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm hover:underline"
          style={{ color: "var(--ds-color-primary-600)" }}
        >
          {site.url} ↗
        </a>

        {statusChart === "fallback" ? (
          <EmptyCard message="Não foi possível carregar os dados desse site agora. Tenta de novo em instantes." />
        ) : (
          <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
        )}
      </main>
    </div>
  );
}
