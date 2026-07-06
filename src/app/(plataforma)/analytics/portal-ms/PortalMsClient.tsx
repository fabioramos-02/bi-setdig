"use client";

import { useMemo } from "react";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { PerfilCidadaoTab } from "./PerfilCidadaoTab";
import { WordCloud } from "@/components/charts/WordCloud";
import { aplicarFiltroPeriodo, resumoDoPeriodo } from "@/lib/period-filter";
import { usePeriodo } from "@/lib/periodo-context";
import { calcularInsightBusca, calcularInsightVisitas, calcularInsightNavegador } from "@/lib/insights";
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
} from "@/lib/data";

export function PortalMsClient({
  diarias,
  navegadores,
  dispositivos,
  horarios,
  cidades,
  paginas,
  busca,
  matchRate,
}: {
  diarias: VisitaDiaria[];
  navegadores: BreakdownPorPeriodo<Navegador>;
  dispositivos: BreakdownPorPeriodo<Dispositivo>;
  horarios: BreakdownPorPeriodo<Horario>;
  cidades: BreakdownPorPeriodo<Cidade>;
  paginas: Pagina[];
  busca: TermoBusca[];
  matchRate: number;
}) {
  // Estado do filtro vem da sidebar (PeriodoProvider) — mesmo estado, gráficos
  // reagem sem barra de filtro dentro do conteúdo.
  const { estado } = usePeriodo();

  // "Intervalo" não tem breakdown próprio (ver ADR-007) — cai no snapshot "mês".
  const periodoAtual: PeriodoFixo = estado.tipo === "intervalo" ? "mes" : estado.tipo;
  const navegadoresAtual = navegadores[periodoAtual];
  const dispositivosAtual = dispositivos[periodoAtual];
  const horariosAtual = horarios[periodoAtual];
  const cidadesAtual = cidades[periodoAtual];

  const tendencia = useMemo(() => aplicarFiltroPeriodo(diarias, estado), [diarias, estado]);
  const kpis = useMemo(() => resumoDoPeriodo(diarias, estado), [diarias, estado]);
  const rotuloPeriodo =
    { dia: "no dia", semana: "na semana", mes: "no mês", ano: "no ano", intervalo: "no intervalo" }[estado.tipo];
  const insightBusca = calcularInsightBusca(busca);
  const insightVisitas = calcularInsightVisitas(diarias);
  const insightNavegador = calcularInsightNavegador(navegadoresAtual);

  const abas: TabItem[] = [
    {
      id: "visao-geral",
      label: "1. Visão Geral",
      content: (
        <div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard label={`Visitas ${rotuloPeriodo}`} value={kpis.visitas} />
            <MetricCard label={`Visitantes únicos ${rotuloPeriodo}`} value={kpis.visitantesUnicos} />
            <MetricCard label={`Ações ${rotuloPeriodo}`} value={kpis.acoes} />
          </div>
          {estado.tipo !== "dia" && (
            <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mt-2">
              Visitantes únicos somados por dia — em períodos de vários dias é uma aproximação (quem visita em mais de um
              dia conta mais de uma vez).
            </p>
          )}
          {insightVisitas.variacaoPct !== null && (
            <div className="mt-4">
              <StoryCard
                anchor={
                  insightVisitas.variacaoPct >= 0
                    ? `As visitas subiram ${insightVisitas.variacaoPct.toFixed(0)}% na última semana em relação à anterior.`
                    : `As visitas caíram ${Math.abs(insightVisitas.variacaoPct).toFixed(0)}% na última semana em relação à anterior.`
                }
                caption={`Média de ${Math.round(insightVisitas.mediaDiaria).toLocaleString("pt-BR")} visitas/dia nos últimos 30 dias.`}
                comoLer="Compara a soma de visitas dos últimos 7 dias com os 7 dias anteriores — varia com dia da semana e feriados, não é um indicador isolado de qualidade do portal."
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: "perfil",
      label: "2. Perfil do Cidadão",
      content: (
        <PerfilCidadaoTab
          tendencia={tendencia}
          matchRate={matchRate}
          cidadesAtual={cidadesAtual}
          navegadoresAtual={navegadoresAtual}
          insightNavegador={insightNavegador}
          dispositivosAtual={dispositivosAtual}
          horariosAtual={horariosAtual}
        />
      ),
    },
    {
      id: "busca",
      label: "3. Intenção de Busca",
      content:
        busca.length === 0 ? (
          <EmptyCard message="Sem termos de busca no período." />
        ) : (
          <div className="overflow-x-auto">
            {insightBusca && (
              <div className="mb-4">
                <StoryCard
                  anchor={`O termo mais buscado foi "${insightBusca.termo}", com ${insightBusca.participacaoPct.toFixed(0)}% das buscas do mês.`}
                  caption={`${insightBusca.buscas.toLocaleString("pt-BR")} buscas registradas por esse termo.`}
                  comoLer="Combina buscas feitas na caixa de pesquisa interna do portal com termos extraídos de URLs com parâmetro de busca (?q=) — não inclui quem chegou via Google ou outro buscador externo."
                />
              </div>
            )}
            <WordCloud termos={busca} />
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                  <th className="pb-2">Termo</th>
                  <th className="pb-2 text-right">Buscas</th>
                </tr>
              </thead>
              <tbody>
                {busca.map((b) => (
                  <tr key={b.termo} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                    <td className="py-1.5">{b.termo}</td>
                    <td className="py-1.5 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                      {b.buscas.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
    },
    {
      id: "paginas",
      label: "4. Páginas mais acessadas",
      content: (
        <div className="overflow-x-auto">
          <div className="flex justify-end mb-2">
            <ExportCsvButton rows={paginas} filename="paginas-mais-acessadas" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                <th className="pb-2">Página</th>
                <th className="pb-2 text-right">Visitas</th>
              </tr>
            </thead>
            <tbody>
              {paginas.map((p) => (
                <tr key={p.url} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                  <td className="py-1.5 truncate max-w-[240px] sm:max-w-none">{p.url}</td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                    {p.visitas.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: "servicos",
      label: "5. Serviços Consumidos",
      disabled: true,
      disabledReason: "Depende do inventário de Cartas de Serviço (Postgres, exige VPN da SETDIG)",
      content: <EmptyCard message="Em breve — depende do inventário de Cartas de Serviço (Postgres/VPN)." />,
    },
    {
      id: "jornada",
      label: "6. Fluxo de Navegação",
      disabled: true,
      disabledReason: "Depende de transitions por URL (N+1 chamadas ao Matomo)",
      content: <EmptyCard message="Em breve — depende de transitions por URL, ainda não extraído." />,
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Analytics — Portal MS">
        <ExportPdfButton />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs items={abas} />
      </main>
    </div>
  );
}
