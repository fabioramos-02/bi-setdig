import { BarChart } from "@/components/charts/BarChart";
import { ChoroplethMap } from "@/components/charts/ChoroplethMap";
import { BrowserBarChart } from "@/components/charts/BrowserBarChart";
import { DeviceBarChart } from "@/components/charts/DeviceBarChart";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightNavegador } from "@/lib/insights";
import type { Cidade, Navegador, Dispositivo, Horario } from "@/lib/data";

/** Conteúdo da aba "Perfil do Cidadão" — extraído de PortalMsClient pra
 * não estourar o limite de 250 linhas/arquivo (regra da esteira spec-driven).
 * Tendência de visitas mora na aba "Visão Geral" (VisaoGeralTab), não aqui.
 * Grid de 4 itens (2x2) — "Top cidades" e "Horário de acesso" ficam juntos
 * no mesmo item (tabela em cima, gráfico embaixo) pra não sobrar item órfão
 * na 3ª linha com um número ímpar de blocos. */
export function PerfilCidadaoTab({
  matchRate,
  cidadesAtual,
  navegadoresAtual,
  insightNavegador,
  dispositivosAtual,
  horariosAtual,
  status,
}: {
  matchRate: number;
  cidadesAtual: Cidade[];
  navegadoresAtual: Navegador[];
  insightNavegador: InsightNavegador | null;
  dispositivosAtual: Dispositivo[];
  horariosAtual: Horario[];
  status: StatusIntervalo;
}) {
  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Distribuição geográfica (MS)
          </h3>
          <ChartLoading status={status} height={260}>
            {matchRate > 0.5 ? (
              <ChoroplethMap cidades={cidadesAtual} />
            ) : (
              <BarChart data={cidadesAtual.slice(0, 15)} xKey="cidade" yKey="visitas" height={260} />
            )}
          </ChartLoading>
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
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2 mt-4">
            Horário de acesso
          </h3>
          <ChartLoading status={status} height={220}>
            <BarChart data={horariosAtual} xKey="hora" yKey="visitas" height={220} />
          </ChartLoading>
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
          <ChartLoading status={status} height={220}>
            <BrowserBarChart dados={navegadoresAtual} />
          </ChartLoading>
        </div>
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Dispositivos
          </h3>
          <ChartLoading status={status} height={220}>
            <DeviceBarChart dados={dispositivosAtual} />
          </ChartLoading>
        </div>
      </div>
    </div>
  );
}
