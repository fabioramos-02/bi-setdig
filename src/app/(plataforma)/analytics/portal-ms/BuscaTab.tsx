import { EmptyCard } from "@/components/ds/EmptyCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { WordCloud } from "@/components/charts/WordCloud";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightBusca } from "@/lib/insights";
import type { TermoBusca } from "@/lib/data";

/** Conteúdo da aba "3. Intenção de Busca". Extraído de PortalMsClient pra
 * não estourar 250 linhas/arquivo. `rotuloPeriodo` reflete o período que o
 * dado REALMENTE é — em "Intervalo", isso é o intervalo real quando `status`
 * é "ok" (busca ao vivo, ADR-010) ou o snapshot do mês em "fallback". */
export function BuscaTab({
  busca,
  rotuloPeriodo,
  insightBusca,
  status,
}: {
  busca: TermoBusca[];
  rotuloPeriodo: string;
  insightBusca: InsightBusca | null;
  status: StatusIntervalo;
}) {
  if (busca.length === 0) {
    return <EmptyCard message="Sem termos de busca no período." />;
  }

  return (
    <div className="overflow-x-auto">
      <AvisoSnapshotAproximado status={status} />
      {insightBusca && (
        <div className="mb-4">
          <StoryCard
            anchor={`O termo mais buscado foi "${insightBusca.termo}", com ${insightBusca.participacaoPct.toFixed(0)}% das buscas ${rotuloPeriodo}.`}
            caption={`${insightBusca.buscas.toLocaleString("pt-BR")} buscas registradas por esse termo.`}
            comoLer="Combina buscas feitas na caixa de pesquisa interna do portal com termos extraídos de URLs com parâmetro de busca (?q=) — não inclui quem chegou via Google ou outro buscador externo."
          />
        </div>
      )}
      <ChartLoading status={status} height={220}>
        <WordCloud termos={busca} />
      </ChartLoading>
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
  );
}
