"use client";

import { useEffect, useState } from "react";
import type { StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { LineChart } from "@/components/charts/LineChart";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { DeviceBarChart } from "@/components/charts/DeviceBarChart";
import { BrowserBarChart } from "@/components/charts/BrowserBarChart";
import { usePeriodo } from "@/lib/periodo-context";
import { intervaloDoBucket } from "@/lib/period-filter";
import type { Site, VisitaDiaria, Pagina, Navegador, Dispositivo } from "@/lib/data";

// Shape devolvido por /api/analytics/sites/[idsite] — sempre ao vivo, não
// existe dataset estático pra nenhum dos sites do catálogo.
type SiteLive = {
  tendencia: VisitaDiaria[];
  paginas: Pagina[];
  navegadores: Navegador[];
  dispositivos: Dispositivo[];
};

export function SiteDetailClient({ site }: { site: Site }) {
  const { estado, min, max } = usePeriodo();
  const range = intervaloDoBucket(estado, min, max);

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

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title={site.nome} />
      <main className="flex-1 p-4 sm:p-6 flex flex-col gap-6">
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
          <>
            <DashboardSection title="Visitas ao longo do tempo">
              <ChartLoading status={statusChart} height={280}>
                {valido && dados!.tendencia.length === 0 ? (
                  <EmptyCard message="Sem dados suficientes nesse período." />
                ) : (
                  <LineChart data={dados?.tendencia ?? []} xKey="data" yKey="visitas" height={280} />
                )}
              </ChartLoading>
            </DashboardSection>

            <DashboardSection title="Páginas mais acessadas">
              <ChartLoading status={statusChart} height={260}>
                {valido && dados!.paginas.length === 0 ? (
                  <EmptyCard message="Sem dados suficientes nesse período." />
                ) : (
                  <RankingBarChart itens={(dados?.paginas ?? []).map((p) => ({ label: p.url, valor: p.visitas, href: p.url }))} />
                )}
              </ChartLoading>
            </DashboardSection>

            <DashboardSection title="Dispositivos e navegadores">
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <div className="min-w-0">
                  <ChartLoading status={statusChart} height={220}>
                    <DeviceBarChart dados={dados?.dispositivos ?? []} />
                  </ChartLoading>
                </div>
                <div className="min-w-0">
                  <ChartLoading status={statusChart} height={220}>
                    <BrowserBarChart dados={dados?.navegadores ?? []} />
                  </ChartLoading>
                </div>
              </div>
            </DashboardSection>
          </>
        )}
      </main>
    </div>
  );
}
