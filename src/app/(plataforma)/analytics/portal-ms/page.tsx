import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ds/PageHeader";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { BarChart } from "@/components/charts/BarChart";
import { ChoroplethMap } from "@/components/charts/ChoroplethMap";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { normalizarNomeCidade } from "@/lib/normalizar-cidade";
import { calcularInsightBusca, calcularInsightVisitas } from "@/lib/insights";
import {
  getMatomoVisitasResumo,
  getMatomoVisitasDiarias,
  getMatomoGeografia,
  getMatomoNavegadores,
  getMatomoDispositivos,
  getMatomoHorarios,
  getMatomoPaginas,
  getMatomoBusca,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Analytics — Portal MS | SETDIG",
};

export default function AnalyticsPortalMsPage() {
  const resumo = getMatomoVisitasResumo()?.[0];
  const diarias = getMatomoVisitasDiarias();
  const cidades = getMatomoGeografia();
  const navegadores = getMatomoNavegadores();
  const dispositivos = getMatomoDispositivos();
  const horarios = getMatomoHorarios();
  const paginas = getMatomoPaginas();
  const busca = getMatomoBusca();
  const insightBusca = calcularInsightBusca(busca);
  const insightVisitas = calcularInsightVisitas(diarias);

  // Taxa de match cidade x geojson — se ficar baixa, cai pra BarChart (mesmo
  // fallback do app antigo, que trocava o mapa por bar chart em caso de erro).
  const geojsonPath = path.join(process.cwd(), "public", "geo", "ms-municipios.geojson");
  const nomesGeojson = new Set<string>(
    JSON.parse(fs.readFileSync(geojsonPath, "utf-8")).features.map((f: { properties: { name: string } }) =>
      normalizarNomeCidade(f.properties.name)
    )
  );
  const matchRate =
    cidades.length > 0
      ? cidades.filter((c) => nomesGeojson.has(normalizarNomeCidade(c.cidade))).length / cidades.length
      : 0;

  if (!resumo) {
    return (
      <div className="flex flex-col flex-1">
        <PageHeader title="Analytics — Portal MS" />
        <main className="flex-1 p-6">
          <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
        </main>
      </div>
    );
  }

  const abas: TabItem[] = [
    {
      id: "perfil",
      label: "1. Perfil do Cidadão",
      content: (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              Distribuição geográfica (MS)
            </h3>
            {matchRate > 0.5 ? (
              <ChoroplethMap cidades={cidades} />
            ) : (
              <BarChart data={cidades.slice(0, 15)} xKey="cidade" yKey="visitas" height={260} />
            )}
          </div>
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              Top cidades (MS)
            </h3>
            <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
              {cidades.slice(0, 10).map((c) => (
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
            <BarChart data={navegadores} xKey="navegador" yKey="visitas" height={220} />
          </div>
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              Dispositivos
            </h3>
            <BarChart data={dispositivos} xKey="dispositivo" yKey="visitas" height={220} />
          </div>
          <div>
            <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
              Horário de acesso
            </h3>
            <BarChart data={horarios} xKey="hora" yKey="visitas" height={220} />
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
      <PageHeader title="Analytics — Portal MS" exportable />
      <main className="flex-1 p-4 sm:p-6">
        <DashboardSection title="Visão geral (mês atual)">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard label="Visitas" value={resumo.visitas} />
            <MetricCard label="Visitantes únicos" value={resumo.visitantesUnicos} />
            <MetricCard label="Ações" value={resumo.acoes} />
          </div>
        </DashboardSection>

        {diarias.length > 0 && (
          <DashboardSection title="Tendência de visitas">
            {insightVisitas.variacaoPct !== null && (
              <StoryCard
                anchor={
                  insightVisitas.variacaoPct >= 0
                    ? `As visitas subiram ${insightVisitas.variacaoPct.toFixed(0)}% na última semana em relação à anterior.`
                    : `As visitas caíram ${Math.abs(insightVisitas.variacaoPct).toFixed(0)}% na última semana em relação à anterior.`
                }
                caption={`Média de ${Math.round(insightVisitas.mediaDiaria).toLocaleString("pt-BR")} visitas/dia nos últimos 30 dias.`}
                comoLer="Compara a soma de visitas dos últimos 7 dias com os 7 dias anteriores — varia com dia da semana e feriados, não é um indicador isolado de qualidade do portal."
              />
            )}
            <div className="mt-4">
              <PeriodFilter dados={diarias} />
            </div>
          </DashboardSection>
        )}

        <Tabs items={abas} />
      </main>
    </div>
  );
}
