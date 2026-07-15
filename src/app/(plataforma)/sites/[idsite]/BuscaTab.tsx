import { EmptyCard } from "@/components/ds/EmptyCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { WordCloud } from "@/components/charts/WordCloud";
import { type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightBusca } from "@/lib/insights";
import type { TermoBusca } from "@/lib/data";

/** Conteúdo da aba "3. Intenção de Busca" — mesma estrutura de
 * portal-ms/BuscaTab.tsx. Cópia local (ver PerfilCidadaoTab.tsx pro porquê). */
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
  // Ao contrário do portal-ms (sempre tem snapshot como fallback), aqui o
  // array vem vazio de verdade enquanto o fetch ainda não resolveu — sem essa
  // checagem de status, o EmptyCard "pisca" antes do skeleton aparecer.
  if (busca.length === 0 && status !== "carregando") {
    return <EmptyCard message="Sem termos de busca no período." />;
  }

  return (
    <div className="overflow-x-auto">
      {insightBusca && (
        <div className="mb-4">
          <StoryCard
            anchor={`O termo mais buscado foi "${insightBusca.termo}", com ${insightBusca.participacaoPct.toFixed(0)}% das buscas ${rotuloPeriodo}.`}
            caption={`${insightBusca.buscas.toLocaleString("pt-BR")} buscas registradas por esse termo.`}
            comoLer="Combina buscas feitas na caixa de pesquisa interna do site com termos digitados que aparecem no endereço da página — não inclui quem chegou via Google ou outro buscador externo."
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
