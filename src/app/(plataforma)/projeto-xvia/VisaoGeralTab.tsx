import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import {
  execucaoFinanceira,
  fmtData,
  fmtNum,
  pendencias,
  prazoProjeto,
  resumoEntregas,
  type TfsContrato,
  type TfsItem,
  type TfsSprint,
} from "@/lib/tfs";

/** Briefing executivo: situação (prazo e andamento) → achados (produção,
 * pendências, UST) → pontos de atenção, com atalho para a aba que detalha. */
export function VisaoGeralTab({
  itens,
  sprints,
  contrato,
  hoje,
  onIrPara,
}: {
  itens: TfsItem[];
  sprints: TfsSprint[];
  contrato: TfsContrato | null;
  hoje: string;
  onIrPara: (aba: string) => void;
}) {
  const prazo = prazoProjeto(contrato, sprints, hoje);
  const resumo = resumoEntregas(itens);
  const fin = execucaoFinanceira(itens, sprints, contrato);
  const paradas = pendencias(itens).filter((p) => (p.diasSemAtualizar ?? 0) >= 15).length;

  const atencao: { texto: string; aba: string }[] = [];
  if (resumo.pendencias > 0)
    atencao.push({ texto: `${fmtNum(resumo.pendencias)} entregas aguardam decisão ou estão impedidas${paradas ? ` — ${fmtNum(paradas)} sem atualização há 15 dias ou mais` : ""}.`, aba: "pendencias" });
  if (fin.tasksSemUst > 0)
    atencao.push({ texto: `${fmtNum(fin.tasksSemUst)} de ${fmtNum(fin.tasksTotal)} tarefas ainda não têm a atividade do contrato (UST) vinculada — o consumo de UST aparece menor do que é.`, aba: "financeiro" });
  if (fin.ustTotalTr === null)
    atencao.push({ texto: "O total de UST do Termo de Referência ainda não foi informado — sem ele não dá para medir quanto do contrato já foi consumido.", aba: "financeiro" });
  if (prazo.fimEstimado)
    atencao.push({ texto: "A data de fim do contrato ainda não foi informada — o prazo usa o fim da última sprint cadastrada.", aba: "visao-geral" });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Prazo restante" value={`${fmtNum(prazo.diasRestantes)} ${prazo.diasRestantes === 1 ? "dia" : "dias"}`} sub={`${prazo.pctDecorrido}% do prazo já passou · fim ${fmtData(prazo.fim)}${prazo.fimEstimado ? " (estimado)" : ""}`} />
        <MetricCard label="Entregas em produção" value={fmtNum(resumo.emProducao)} sub={`${resumo.pctProducao}% de ${fmtNum(resumo.total)} entregas`} />
        <MetricCard label="Pendências abertas" value={fmtNum(resumo.pendencias)} sub={`de ${fmtNum(resumo.abertas)} entregas em aberto`} />
        <MetricCard
          label="UST executadas"
          value={fmtNum(fin.ustExecutada)}
          sub={fin.ustTotalTr ? `${fin.pctTr}% de ${fmtNum(fin.ustTotalTr)} UST do TR` : "total do TR a informar"}
        />
      </div>

      <StoryCard
        anchor={`${resumo.pctProducao}% das entregas do projeto X-VIA já estão em produção, com ${prazo.pctDecorrido}% do prazo decorrido.`}
        caption={prazo.sprintAtual ? `Sprint atual: ${prazo.sprintAtual.nome} (${fmtData(prazo.sprintAtual.inicio)} a ${fmtData(prazo.sprintAtual.fim)}).` : undefined}
        comoLer="Entrega é cada item do quadro (história ou bug). Está em produção quando chega à coluna Em Produção. As UST somam só as tarefas concluídas com a atividade do contrato vinculada no TFS."
      />

      {atencao.length > 0 && (
        <DashboardSection title="O que precisa de atenção?">
          <ul className="flex flex-col gap-3">
            {atencao.map((a) => (
              <li key={a.texto} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <span style={{ color: "var(--ds-color-text-primary)" }}>{a.texto}</span>
                {a.aba !== "visao-geral" && (
                  <button
                    type="button"
                    onClick={() => onIrPara(a.aba)}
                    className="shrink-0 text-sm font-medium underline"
                    style={{ color: "var(--ds-color-primary-600)" }}
                  >
                    Ver detalhes
                  </button>
                )}
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}

      <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
        Contrato iniciado em {fmtData(prazo.inicio)}. Dados do TFS (projeto XVIA), atualizados uma vez por dia.
      </p>
    </div>
  );
}
