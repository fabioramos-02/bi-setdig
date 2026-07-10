import { EmptyCard } from "@/components/ds/EmptyCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { WordCloud } from "@/components/charts/WordCloud";
import { AvisoSnapshotAproximado } from "@/components/dashboard/AvisoSnapshotAproximado";
import type { InsightBusca } from "@/lib/insights";
import type { TermoBusca } from "@/lib/data";

/** Conteúdo da aba "3. Intenção de Busca". Extraído de PortalMsClient pra
 * não estourar 250 linhas/arquivo. `rotuloPeriodo` aqui é o período que o
 * dado REALMENTE é (periodoAtual do Client), não o que o usuário selecionou
 * — em "Intervalo" os dois divergem (ADR-007), ver AvisoSnapshotAproximado. */
export function BuscaTab({
  busca,
  rotuloPeriodo,
  insightBusca,
  tipoIntervalo,
}: {
  busca: TermoBusca[];
  rotuloPeriodo: string;
  insightBusca: InsightBusca | null;
  tipoIntervalo: boolean;
}) {
  if (busca.length === 0) {
    return <EmptyCard message="Sem termos de busca no período." />;
  }

  return (
    <div className="overflow-x-auto">
      <AvisoSnapshotAproximado tipoIntervalo={tipoIntervalo} />
      {insightBusca && (
        <div className="mb-4">
          <StoryCard
            anchor={`O termo mais buscado foi "${insightBusca.termo}", com ${insightBusca.participacaoPct.toFixed(0)}% das buscas ${rotuloPeriodo}.`}
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
  );
}
