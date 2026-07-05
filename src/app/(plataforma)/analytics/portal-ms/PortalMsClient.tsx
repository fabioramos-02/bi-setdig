"use client";

import { useMemo, useState } from "react";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { ChoroplethMap } from "@/components/charts/ChoroplethMap";
import { aplicarFiltroPeriodo, type PeriodoState } from "@/lib/period-filter";
import { calcularInsightBusca, calcularInsightVisitas, calcularInsightNavegador } from "@/lib/insights";
import type {
  VisitasResumo,
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
  resumo,
  diarias,
  navegadores,
  dispositivos,
  horarios,
  cidades,
  paginas,
  busca,
  matchRate,
}: {
  resumo: VisitasResumo;
  diarias: VisitaDiaria[];
  navegadores: BreakdownPorPeriodo<Navegador>;
  dispositivos: BreakdownPorPeriodo<Dispositivo>;
  horarios: BreakdownPorPeriodo<Horario>;
  cidades: BreakdownPorPeriodo<Cidade>;
  paginas: Pagina[];
  busca: TermoBusca[];
  matchRate: number;
}) {
  const min = diarias[0]?.data ?? "";
  const max = diarias[diarias.length - 1]?.data ?? "";
  const [estado, setEstado] = useState<PeriodoState>({ tipo: "mes", dataRef: max });

  // "Intervalo" não tem breakdown próprio (ver ADR-007) — cai no snapshot "mês".
  const periodoAtual: PeriodoFixo = estado.tipo === "intervalo" ? "mes" : estado.tipo;
  const navegadoresAtual = navegadores[periodoAtual];
  const dispositivosAtual = dispositivos[periodoAtual];
  const horariosAtual = horarios[periodoAtual];
  const cidadesAtual = cidades[periodoAtual];

  const tendencia = useMemo(() => aplicarFiltroPeriodo(diarias, estado), [diarias, estado]);
  const insightBusca = calcularInsightBusca(busca);
  const insightVisitas = calcularInsightVisitas(diarias);
  const insightNavegador = calcularInsightNavegador(navegadoresAtual);

  const abas: TabItem[] = [
    {
      id: "perfil",
      label: "1. Perfil do Cidadão",
      content: (
        <div className="flex flex-col gap-6">
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              Tendência de visitas
            </h3>
            <div className="flex justify-end mb-2">
              <ExportCsvButton rows={tendencia} filename="visitas-por-periodo" />
            </div>
            <LineChart data={tendencia} xKey="rotulo" yKey="visitas" />
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Distribuição geográfica (MS)
              </h3>
              {matchRate > 0.5 ? (
                <ChoroplethMap cidades={cidadesAtual} />
              ) : (
                <BarChart data={cidadesAtual.slice(0, 15)} xKey="cidade" yKey="visitas" height={260} />
              )}
            </div>
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Top cidades (MS)
              </h3>
              <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
                {cidadesAtual.slice(0, 10).map((c) => (
                  <li key={c.cidade} className="flex justify-between border-b py-1" style={{ borderColor: "var(--ds-color-border)" }}>
                    <span>{c.cidade}</span>
                    <span style={{ color: "var(--ds-color-primary-600)" }} className="font-semibold">
                      {c.visitas.toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Navegadores
              </h3>
              {insightNavegador && (
                <p style={{ color: "var(--ds-color-text-muted)" }} className="text-xs mb-2">
                  {insightNavegador.navegador} é o navegador de {insightNavegador.participacaoPct.toFixed(0)}% dos acessos.
                </p>
              )}
              <BarChart data={navegadoresAtual} xKey="navegador" yKey="visitas" height={220} />
            </div>
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Dispositivos
              </h3>
              <BarChart data={dispositivosAtual} xKey="dispositivo" yKey="visitas" height={220} />
            </div>
            <div>
              <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
                Horário de acesso
              </h3>
              <BarChart data={horariosAtual} xKey="hora" yKey="visitas" height={220} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "busca",
      label: "2. Intenção de Busca",
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
      label: "3. Páginas mais acessadas",
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
      label: "4. Serviços Consumidos",
      disabled: true,
      disabledReason: "Depende do inventário de Cartas de Serviço (Postgres, exige VPN da SETDIG)",
      content: <EmptyCard message="Em breve — depende do inventário de Cartas de Serviço (Postgres/VPN)." />,
    },
    {
      id: "jornada",
      label: "5. Fluxo de Navegação",
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
      <FilterBar estado={estado} onEstadoChange={setEstado} min={min} max={max} />
      <main className="flex-1 p-4 sm:p-6">
        <DashboardSection title="Visão geral (mês atual)">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard label="Visitas" value={resumo.visitas} />
            <MetricCard label="Visitantes únicos" value={resumo.visitantesUnicos} />
            <MetricCard label="Ações" value={resumo.acoes} />
          </div>
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
        </DashboardSection>

        <Tabs items={abas} />
      </main>
    </div>
  );
}
