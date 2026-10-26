import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { execucaoFinanceira, fmtNum, fmtReais, type TfsContrato, type TfsItem, type TfsSprint } from "@/lib/tfs";

type LinhaFin = ReturnType<typeof execucaoFinanceira>["porModulo"][number];

/** Execução financeira: UST priorizadas (sprint atual e futuras) e executadas
 * (tarefas concluídas), cruzadas com o total do Termo de Referência e o valor
 * da UST — os dois vêm de datasets/tfs/v1/contrato.json, preenchido à mão. */
export function FinanceiroTab({ itens, sprints, contrato }: { itens: TfsItem[]; sprints: TfsSprint[]; contrato: TfsContrato | null }) {
  const f = execucaoFinanceira(itens, sprints, contrato);
  const reais = (v: number | null) => (v === null ? "R$/UST a informar" : fmtReais(v));

  const colunas: Coluna<LinhaFin>[] = [
    { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico, render: (r) => r.epico },
    { key: "previsao", label: "Previsto no TR", align: "right", sortable: true, sortValue: (r) => r.previsao ?? -1, render: (r) => (r.previsao === null ? "—" : fmtNum(r.previsao)) },
    { key: "priorizada", label: "UST priorizadas", align: "right", sortable: true, sortValue: (r) => r.priorizada, render: (r) => fmtNum(r.priorizada) },
    { key: "executada", label: "UST executadas", align: "right", sortable: true, sortValue: (r) => r.executada, render: (r) => fmtNum(r.executada) },
    ...(contrato?.valorUst
      ? [{ key: "valor", label: "Valor executado", align: "right" as const, sortable: true, sortValue: (r: LinhaFin) => r.executada, render: (r: LinhaFin) => fmtReais(r.executada * (contrato.valorUst ?? 0)) }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="UST priorizadas" value={fmtNum(f.ustPriorizada)} sub={reais(f.valorPriorizado)} />
        <MetricCard label="UST executadas" value={fmtNum(f.ustExecutada)} sub={reais(f.valorExecutado)} />
        <MetricCard label="Total do TR" value={f.ustTotalTr === null ? "a informar" : `${fmtNum(f.ustTotalTr)} UST`} sub={f.pctTr === null ? "sem o total, não há percentual" : `${f.pctTr}% já executado`} />
        <MetricCard label="Tarefas sem atividade UST" value={fmtNum(f.tasksSemUst)} sub={`de ${fmtNum(f.tasksTotal)} tarefas no TFS`} />
      </div>

      <StoryCard
        anchor={`Foram priorizadas ${fmtNum(f.ustPriorizada)} UST para as sprints em andamento e executadas ${fmtNum(f.ustExecutada)} UST até aqui.`}
        caption={f.tasksSemUst > 0 ? `${fmtNum(f.tasksSemUst)} tarefas ainda estão sem a atividade do contrato no TFS — enquanto não forem vinculadas, ficam fora destes números.` : undefined}
        comoLer="Cada tarefa do TFS é ligada a uma atividade do catálogo do contrato, e a complexidade escolhida define quantas UST ela vale. Executada = tarefa concluída. Priorizada = tarefa aberta na sprint atual ou nas próximas. O total do TR e o valor da UST são informados pela SETDIG."
      />

      <DashboardSection title="Quanto cada módulo consumiu de UST?">
        {f.porModulo.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>Nenhuma tarefa com atividade UST vinculada ainda.</p>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <DataTable columns={colunas} rows={f.porModulo} rowKey={(r) => r.epico} />
          </div>
        )}
      </DashboardSection>
    </div>
  );
}
