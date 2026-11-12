import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { lerQuadroTime, type CardPainel, type WidgetPainel } from "@/lib/tfs-painel";

/** Aba "Acompanhamento do time": o mesmo quadro que o time usa no dia a dia,
 * atualizado manualmente na rede do Governo. Os números vêm prontos das consultas do quadro,
 * por isso os filtros do topo (módulo, frente, órgão, sprint) não valem aqui. */
export function AcompanhamentoTab({ widgets, atualizadoEm, diasSemAtualizar }: {
  widgets: WidgetPainel[];
  atualizadoEm: string | null;
  diasSemAtualizar: number | null;
}) {
  if (widgets.length === 0) {
    return <EmptyCard message="Os números do quadro do time ainda não foram lidos. Eles aparecem depois da próxima atualização." />;
  }

  const q = lerQuadroTime(widgets);
  const data = atualizadoEm ? new Date(atualizadoEm).toLocaleDateString("pt-BR") : null;
  const atrasado = diasSemAtualizar !== null && diasSemAtualizar > 2;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {atrasado && (
        <p role="status" className="text-sm rounded-md px-4 py-3" style={{ background: "color-mix(in srgb, var(--ds-color-warning) 15%, transparent)", color: "var(--ds-color-text-primary)" }}>
          Estes números são de {data}, há {diasSemAtualizar} dias — é necessário solicitar uma nova atualização.
        </p>
      )}

      <StoryCard
        anchor={q.anchor ?? "Nenhum item está impedido, aguardando decisão ou com bug no quadro do time."}
        comoLer={`Mesmos números do quadro que o time acompanha no dia a dia, contados pelas consultas do próprio quadro${data ? ` em ${data}` : ""}. Atualização manual na rede do Governo. Os filtros do topo da página não se aplicam a esta aba.`}
      />

      {q.acao.length > 0 && (
        <DashboardSection title="O que pede ação do time agora?">
          <Cards cards={q.acao} />
        </DashboardSection>
      )}

      {q.andamento.length > 0 && (
        <DashboardSection title="O que está em andamento ou saiu da fila?">
          <Cards cards={q.andamento} />
        </DashboardSection>
      )}

      {q.tamanho.length > 0 && (
        <DashboardSection title="Qual o tamanho do trabalho?">
          <Cards cards={q.tamanho} />
        </DashboardSection>
      )}

      {q.graficos.map((g) => (
        <DashboardSection key={g.pergunta} title={g.pergunta}>
          {g.grupos.length > 0 ? (
            <RankingBarChart itens={g.grupos.map((x) => ({ label: x.rotulo, valor: x.qtd }))} />
          ) : (
            <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>Nenhum item nesta consulta hoje.</p>
          )}
          <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            {g.total.toLocaleString("pt-BR")} itens no total.
          </p>
        </DashboardSection>
      ))}
    </div>
  );
}

function Cards({ cards }: { cards: CardPainel[] }) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => <MetricCard key={c.rotulo} label={c.rotulo} value={c.total} />)}
    </div>
  );
}
