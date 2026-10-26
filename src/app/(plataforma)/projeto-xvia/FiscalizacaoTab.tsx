import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import {
  COLUNA_PRODUCAO,
  ehEntrega,
  entregasDaSprint,
  entregasDoMes,
  fmtData,
  fmtNum,
  linkTfs,
  sprintAtual,
  type TfsItem,
  type TfsSprint,
} from "@/lib/tfs";

const colunas: Coluna<TfsItem>[] = [
  {
    key: "titulo", label: "Entrega", sortable: true, sortValue: (r) => r.titulo,
    render: (r) => (
      <a href={linkTfs(r.id)} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>
        #{r.id} {r.titulo}
      </a>
    ),
  },
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico ?? "", render: (r) => r.epico ?? "—" },
  { key: "frente", label: "Frente", sortable: true, sortValue: (r) => r.frente, render: (r) => r.frente },
  { key: "tipo", label: "Tipo de entrega", sortable: true, sortValue: (r) => r.tipoEntrega ?? "", render: (r) => r.tipoEntrega ?? "—" },
  { key: "fechado", label: "Concluída em", sortable: true, sortValue: (r) => r.fechadoEm ?? "", render: (r) => fmtData(r.fechadoEm) },
];

/** Fiscalização e aceite: o que foi priorizado na sprint atual (e onde está no
 * quadro), o que foi entregue no mês e o que já está em produção. */
export function FiscalizacaoTab({ itens, sprints, hoje }: { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string }) {
  const atual = sprintAtual(sprints);
  const sprint = entregasDaSprint(itens, atual);
  const mes = hoje.slice(0, 7);
  const nomeMes = new Date(`${mes}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const doMes = entregasDoMes(itens, mes);
  const totalMes = doMes.reduce((s, g) => s + g.itens.length, 0);
  const emProducao = itens.filter((i) => ehEntrega(i) && i.coluna === COLUNA_PRODUCAO);
  const nomeSprint = (path: string) => sprints.find((s) => s.sprint === path)?.nome ?? path;

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={
          atual
            ? `A ${atual.nome} priorizou ${fmtNum(sprint.itens.length)} entregas; ${fmtNum(totalMes)} foram concluídas em ${nomeMes}.`
            : `${fmtNum(totalMes)} entregas foram concluídas em ${nomeMes}.`
        }
        caption={atual ? `${atual.nome}: de ${fmtData(atual.inicio)} a ${fmtData(atual.fim)}.` : undefined}
        comoLer="Priorizada é a entrega colocada na sprint atual. Concluída no mês é a que fechou (estado Done) dentro do mês, agrupada pela sprint em que estava."
      />

      {atual && sprint.porColuna.length > 0 && (
        <DashboardSection title={`Onde estão as entregas da ${atual.nome}?`}>
          <RankingBarChart itens={sprint.porColuna.map((c) => ({ label: c.coluna, valor: c.total }))} />
        </DashboardSection>
      )}

      <DashboardSection title={`O que foi entregue em ${nomeMes}?`}>
        {doMes.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>Nenhuma entrega concluída neste mês até agora.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {doMes.map((g) => (
              <div key={g.sprint} className="min-w-0">
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--ds-color-text-primary)" }}>
                  {nomeSprint(g.sprint)} · {fmtNum(g.itens.length)} entregas
                </h3>
                <div className="overflow-x-auto min-w-0">
                  <DataTable columns={colunas} rows={g.itens} rowKey={(r) => String(r.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardSection>

      <DashboardSection title={`O que já está em produção? (${fmtNum(emProducao.length)})`}>
        <div className="overflow-x-auto min-w-0">
          <DataTable columns={colunas} rows={emProducao} rowKey={(r) => String(r.id)} />
        </div>
      </DashboardSection>
    </div>
  );
}
