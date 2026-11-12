import { fmtNum, type Ans, type bugsDoQa } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { BotaoLink, Sigla, cinza } from "./comum";

/** Seção 6 do relatório — prazos de atendimento (SLA, TR 4.3.1). Mostra o compromisso e diz por
 * que ainda não é medido; nunca inventa percentual. As falhas do QA aparecem à parte, como
 * qualidade do desenvolvimento, porque não são SLA (Fabio, 11/11/2026). */
export function SlaSecao({ ans, bugs, onIrPara }: { ans: Ans | null; bugs: ReturnType<typeof bugsDoQa>; onIrPara: (aba: string) => void }) {
  const medido = ans?.medicao ?? null;
  return (
    <div className="flex flex-col gap-3">
      <div>
        {medido
          ? <>Cumprimento dos prazos em {medido.mes}, segundo {medido.fonte}.</>
          : <>O contrato fixa prazos para a X-VIA começar a atender e resolver cada problema, conforme a gravidade (<Sigla s="SLA" />). <b>Ainda não dá para medir se eles estão sendo cumpridos</b>: os chamados de suporte não passam pelo TFS, e o relatório de prazos da X-VIA não foi entregue.</>}
      </div>

      {ans && (
        <div className="overflow-x-auto min-w-0">
          <table className="w-full bi-body">
            <thead>
              <tr style={{ color: "var(--ds-color-text-secondary)" }}>
                <th className="text-left font-medium py-1 pr-3">Gravidade</th>
                <th className="text-left font-medium py-1 pr-3">Começar a atender em</th>
                <th className="text-left font-medium py-1 pr-3">Resolver em</th>
                <th className="text-right font-medium py-1">Meta (% no prazo)</th>
                {medido && <th className="text-right font-medium py-1 pl-3">Cumprido</th>}
              </tr>
            </thead>
            <tbody>
              {ans.prioridades.map((p) => {
                const m = medido?.porPrioridade.find((x) => x.prioridade === p.prioridade);
                const pct = m && m.total ? Math.round((m.noPrazo / m.total) * 100) : null;
                return (
                  <tr key={p.prioridade} style={{ borderTop: "1px solid var(--ds-color-border)" }}>
                    <td className="py-1.5 pr-3 font-medium">{p.prioridade}</td>
                    <td className="py-1.5 pr-3">{p.inicio}</td>
                    <td className="py-1.5 pr-3">{p.solucao}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.aceitavel}%</td>
                    {medido && <td className="py-1.5 pl-3 text-right tabular-nums">{pct === null ? "—" : `${pct}%`}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-1 bi-caption" style={cinza}>Abaixo da meta, o contrato prevê desconto de 0,1% a 0,5% na nota fiscal por ponto percentual. Fonte: {ans.fonte}.</div>
        </div>
      )}

      {!medido && (
        <div>
          <b>O que falta para medir</b>
          <ul className="mt-1 list-disc pl-5 flex flex-col gap-0.5">
            <li>A X-VIA entregar o relatório mensal de prazos de atendimento, como prevê o contrato.</li>
            <li>Cada chamado ter a gravidade classificada (crítica, alta, média ou baixa).</li>
            <li>A SGD registrar o resultado do mês no painel.</li>
          </ul>
        </div>
      )}

      {bugs.total > 0 && (
        <div className="bi-body" style={{ borderTop: "1px solid var(--ds-color-border)", paddingTop: 10 }}>
          <b>Qualidade do desenvolvimento:</b> {fmtNum(bugs.total)} falhas apontadas pelo QA estão abertas
          {bugs.modulos.length ? ` (${bugs.modulos.slice(0, 3).map((m) => `${fmtNum(m.n)} ${m.modulo === "sem módulo" ? "sem módulo" : `no ${m.modulo}`}`).join(", ")})` : ""}.{" "}
          <span style={cinza}>Não contam para o SLA: fazem parte do desenvolvimento, antes da entrega ir para produção.</span>
          <span className="ml-2 inline-flex gap-3 print:hidden">
            <OrigemBotao origem={bugs.origem} />
            <BotaoLink onClick={() => onIrPara("cronograma")}>Ver no cronograma</BotaoLink>
          </span>
        </div>
      )}
    </div>
  );
}
