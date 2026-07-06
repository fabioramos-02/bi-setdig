"use client";

import { useMemo, useState } from "react";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { PerfilCidadaoTab } from "./PerfilCidadaoTab";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { WordCloud } from "@/components/charts/WordCloud";
import { aplicarFiltroPeriodo, resumoDoPeriodo } from "@/lib/period-filter";
import { usePeriodo } from "@/lib/periodo-context";
import {
  calcularInsightBusca,
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
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  // "Intervalo" não tem breakdown próprio (ver ADR-007) — cai no snapshot "mês".
  const periodoAtual: PeriodoFixo = estado.tipo === "intervalo" ? "mes" : estado.tipo;
  const navegadoresAtual = navegadores[periodoAtual];
  const dispositivosAtual = dispositivos[periodoAtual];
  const horariosAtual = horarios[periodoAtual];
  const cidadesAtual = cidades[periodoAtual];

  const tendencia = useMemo(() => aplicarFiltroPeriodo(diarias, estado), [diarias, estado]);
  const kpis = useMemo(() => resumoDoPeriodo(diarias, estado), [diarias, estado]);
  const insightBusca = calcularInsightBusca(busca);
  const insightVisitas = calcularInsightVisitas(tendencia, estado.tipo);
  const insightNavegador = calcularInsightNavegador(navegadoresAtual);
  const insightDispositivo = calcularInsightDispositivo(dispositivosAtual);
  const paginaTop = paginas[0] ?? null;

  const abas: TabItem[] = [
    {
      id: "visao-geral",
      label: "1. Visão Geral",
      content: (
        <VisaoGeralTab
          kpis={kpis}
          rotuloPeriodo={ROTULO_PERIODO[estado.tipo]}
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
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
