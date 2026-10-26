import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import {
  execucaoXvia,
  fmtData,
  fmtNum,
  pendencias,
  prazoProjeto,
  resumoEntregas,
  type EtpUst,
  type TfsContrato,
  type TfsItem,
  type TfsSprint,
} from "@/lib/tfs";

/** Três réguas na mesma escala (0–100%): quanto do prazo passou, quanto das
 * entregas está em produção e quanto da UST do ETP foi executada. Se as duas
 * de baixo ficam muito atrás da primeira, o projeto está fora do ritmo. */
function Ritmo({ linhas }: { linhas: { label: string; pct: number | null; detalhe: string; cor: string }[] }) {
  return (
    <div className="flex flex-col gap-4">
      {linhas.map((l) => (
        <div key={l.label}>
          <div className="flex justify-between items-baseline gap-3 text-sm mb-1">
            <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>{l.label}</span>
            <span className="text-lg font-semibold shrink-0" style={{ color: l.cor }}>{l.pct === null ? "—" : `${l.pct}%`}</span>
          </div>
          <div className="h-3 rounded" style={{ background: "var(--ds-color-background-muted)" }}>
            <div className="h-3 rounded" style={{ width: `${Math.min(l.pct ?? 0, 100)}%`, background: l.cor }} />
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>{l.detalhe}</p>
        </div>
      ))}
    </div>
  );
}

/** Briefing executivo: o projeto está no ritmo? → números com comparação →
 * o que precisa de atenção, com atalho para a aba que detalha. */
export function VisaoGeralTab({
  itens,
  sprints,
  contrato,
  etp,
  hoje,
  onIrPara,
}: {
  itens: TfsItem[];
  sprints: TfsSprint[];
  contrato: TfsContrato | null;
  etp: EtpUst | null;
  hoje: string;
  onIrPara: (aba: string) => void;
}) {
  const prazo = prazoProjeto(contrato, sprints, hoje);
  const resumo = resumoEntregas(itens);
  const ust = execucaoXvia(itens, etp, contrato);
  const paradas = pendencias(itens).filter((p) => (p.diasSemAtualizar ?? 0) >= 15).length;
  const aClassificar = ust.aClassificar.length;

  const atencao: { texto: string; aba: string }[] = [];
  if (resumo.pendencias > 0)
    atencao.push({ texto: `${fmtNum(resumo.pendencias)} entregas aguardam decisão ou estão impedidas${paradas ? ` — ${fmtNum(paradas)} sem atualização há 15 dias ou mais` : ""}.`, aba: "pendencias" });
  if (aClassificar > 0)
    atencao.push({ texto: `${fmtNum(aClassificar)} de ${fmtNum(ust.tarefas)} tarefas da X-VIA não têm um código do ETP na descrição — ficam fora da conta de UST até serem corrigidas.`, aba: "ust" });
  if (ust.tarefas > 0 && ust.ustExecutada === 0)
    atencao.push({ texto: "Nenhuma tarefa da X-VIA está concluída no TFS, então a UST executada aparece zerada. As tarefas reabertas na revisão do backlog precisam ser fechadas pela X-VIA.", aba: "ust" });
  if (prazo.fimEstimado)
    atencao.push({ texto: "A data de fim do contrato ainda não foi informada — o prazo usa o fim da última sprint cadastrada.", aba: "visao-geral" });

  const pctUst = ust.pctExecutado;
  const atrasado = pctUst !== null && prazo.pctDecorrido - Math.max(resumo.pctProducao, pctUst) >= 20;

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={
          atrasado
            ? `O projeto anda atrás do relógio: ${prazo.pctDecorrido}% do prazo já passou, mas só ${resumo.pctProducao}% das entregas estão em produção e ${pctUst}% da UST prevista foi executada.`
            : `${resumo.pctProducao}% das entregas estão em produção, com ${prazo.pctDecorrido}% do prazo decorrido.`
        }
        caption={prazo.sprintAtual ? `Sprint atual: ${prazo.sprintAtual.nome} (${fmtData(prazo.sprintAtual.inicio)} a ${fmtData(prazo.sprintAtual.fim)}).` : undefined}
        comoLer="Entrega é cada item do quadro (história ou bug); está em produção quando chega à coluna Em Produção. A UST conta só as tarefas da X-VIA concluídas, pelo valor que o ETP dá a cada atividade."
      />

      <DashboardSection title="O projeto está no ritmo?">
        <Ritmo
          linhas={[
            { label: "Prazo decorrido", pct: prazo.pctDecorrido, detalhe: `De ${fmtData(prazo.inicio)} a ${fmtData(prazo.fim)}${prazo.fimEstimado ? " (fim estimado)" : ""} — faltam ${fmtNum(prazo.diasRestantes)} ${prazo.diasRestantes === 1 ? "dia" : "dias"}.`, cor: "var(--ds-color-text-secondary)" },
            { label: "Entregas em produção", pct: resumo.pctProducao, detalhe: `${fmtNum(resumo.emProducao)} de ${fmtNum(resumo.total)} entregas.`, cor: "var(--ds-color-primary-600)" },
            { label: "UST do ETP executada pela X-VIA", pct: pctUst, detalhe: ust.ustTotal ? `${fmtNum(ust.ustExecutada)} de ${fmtNum(ust.ustTotal)} UST previstas no ETP.` : "Total do ETP não carregado.", cor: "var(--ds-color-success)" },
          ]}
        />
      </DashboardSection>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Entregas em aberto" value={fmtNum(resumo.abertas)} sub={`de ${fmtNum(resumo.total)} no projeto`} />
        <MetricCard label="Pendências" value={fmtNum(resumo.pendencias)} sub={`${resumo.abertas ? Math.round((resumo.pendencias / resumo.abertas) * 100) : 0}% das entregas em aberto`} />
        <MetricCard label="UST lançada pela X-VIA" value={fmtNum(ust.ustLancada)} sub={ust.pctLancado === null ? "—" : `${ust.pctLancado}% do previsto no ETP`} />
        <MetricCard label="Tarefas X-VIA a classificar" value={fmtNum(aClassificar)} sub={`de ${fmtNum(ust.tarefas)} tarefas da X-VIA`} />
      </div>

      {atencao.length > 0 && (
        <DashboardSection title="O que precisa de atenção?">
          <ul className="flex flex-col gap-3">
            {atencao.map((a) => (
              <li key={a.texto} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <span style={{ color: "var(--ds-color-text-primary)" }}>{a.texto}</span>
                {a.aba !== "visao-geral" && (
                  <button type="button" onClick={() => onIrPara(a.aba)} className="shrink-0 text-sm font-medium underline" style={{ color: "var(--ds-color-primary-600)" }}>
                    Ver detalhes
                  </button>
                )}
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}
    </div>
  );
}
