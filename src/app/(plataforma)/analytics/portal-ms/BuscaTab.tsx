import { EmptyCard } from "@/components/ds/EmptyCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { OportunidadeCard } from "@/components/dashboard/OportunidadeCard";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightBusca } from "@/lib/insights";
import { agruparPorTema, gerarResumoBusca } from "@/lib/busca-tema";
import type { TermoBusca } from "@/lib/data";

const TOP_N = 10;

/** Conteúdo da aba "3. Intenção de Busca" — pensada pra leitura de gestor
 * (AGENTS.md "BI de gestão"): o que aconteceu → o que significa →
 * oportunidade, depois assunto (tema) antes de termo isolado — gestor pensa
 * em demanda por assunto, não em palavra-chave. Extraído de PortalMsClient
 * pra não estourar 250 linhas/arquivo. `rotuloPeriodo` reflete o período que
 * o dado REALMENTE é — em "Intervalo", isso é o intervalo real quando
 * `status` é "ok" (busca ao vivo, ADR-010) ou o snapshot do mês em "fallback". */
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

  const temas = agruparPorTema(busca);
  const resumo = insightBusca ? gerarResumoBusca(insightBusca, temas, rotuloPeriodo) : null;
  const top = [...busca].sort((a, b) => b.buscas - a.buscas);
  const restante = top.slice(TOP_N);

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />

      {resumo && (
        <StoryCard
          anchor={resumo.oQueAconteceu}
          caption={resumo.oQueSignifica}
          comoLer="Combina buscas feitas na caixa de pesquisa interna do portal com termos digitados que aparecem no endereço da página — não inclui quem chegou via Google ou outro buscador externo."
        >
          <OportunidadeCard texto={resumo.oportunidade} />
        </StoryCard>
      )}

      <div>
        <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-3">
          Sobre o que os cidadãos procuram informação?
        </h3>
        <ChartLoading status={status} height={180}>
          <RankingBarChart itens={temas.map((t) => ({ label: t.tema, valor: t.buscas, sublabel: `${t.participacaoPct.toFixed(0)}%` }))} />
        </ChartLoading>
      </div>

      <div>
        <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-3">
          Termos mais buscados
        </h3>
        <ChartLoading status={status} height={260}>
          <RankingBarChart itens={top.slice(0, TOP_N).map((t) => ({ label: t.termo, valor: t.buscas }))} />
        </ChartLoading>

        {restante.length > 0 && (
          <details className="mt-3 print-expandir">
            <summary className="text-sm cursor-pointer" style={{ color: "var(--ds-color-text-secondary)" }}>
              Ver todos os {top.length} termos
            </summary>
            <ul className="text-sm mt-2 space-y-1">
              {restante.map((t) => (
                <li key={t.termo} className="flex justify-between border-t py-1" style={{ borderColor: "var(--ds-color-border)" }}>
                  <span>{t.termo}</span>
                  <span style={{ color: "var(--ds-color-text-muted)" }}>{t.buscas.toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
