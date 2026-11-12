import { fmtData, fmtNum, fmtReais, PALAVRA_TOM, type execucaoMensal } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { COR, Sigla, cinza } from "./comum";

type Dados = ReturnType<typeof execucaoMensal>;
const nomeLongo = (aaaamm: string) => new Date(`${aaaamm}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });

/** Seção 3 — "O que foi executado no mês?". Frase com o último mês fechado contra o previsto no
 * TR; o mês corrente aparece como "em andamento", sem nota. Depois, a régua mês a mês (barra =
 * executado; traço = previsto) e, quando a data de fechamento do TFS contaria outro número, a
 * explicação ao lado do dado. */
export function ExecucaoMensal({ dados, hoje }: { dados: Dados; hoje: string }) {
  const { linhas, fechado, atual, origem } = dados;
  const escala = Math.max(1, ...linhas.map((l) => Math.max(l.ust, l.previsto ?? 0)));
  const pct = (v: number) => `${Math.min(100, (v / escala) * 100)}%`;
  const enganaFechamento = atual && Math.abs(atual.fechadoNoMes - atual.ust) >= Math.max(20, atual.ust * 0.5);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-base" style={{ color: "var(--ds-color-text-primary)", lineHeight: 1.5 }}>
        {fechado ? (
          <>
            Em <b>{nomeLongo(fechado.mes)}</b> (mês {fechado.n} do contrato), a X-VIA executou{" "}
            <b className="tabular-nums">{fmtNum(fechado.ust)} <Sigla s="UST" /></b>
            {fechado.reais !== null && <> ({fmtReais(fechado.reais)})</>}
            {fechado.previsto ? (
              <>
                : <b style={{ color: "var(--ds-color-text-primary)" }}>{fechado.pct}%</b> das {fmtNum(fechado.previsto)} previstas no <Sigla s="TR" /> para o mês
                {" "}<span className="text-sm font-semibold uppercase" style={{ color: "var(--ds-color-text-primary)", letterSpacing: "0.04em" }}>({PALAVRA_TOM[fechado.tom]})</span>.
              </>
            ) : "."}
          </>
        ) : "Ainda não há mês fechado no contrato."}
        {atual && (
          <span className="block text-sm mt-1" style={{ color: "var(--ds-color-text-secondary)" }}>
            {nomeLongo(atual.mes).replace(/^./, (c) => c.toUpperCase())} está em andamento: {fmtNum(atual.ust)} UST até {fmtData(hoje)}
            {atual.previsto ? `, de ${fmtNum(atual.previsto)} previstas para o mês` : ""}.
          </span>
        )}
      </div>

      <figure className="m-0">
        <figcaption className="sr-only">UST executadas por mês do contrato, comparadas com o previsto no TR.</figcaption>
        <ul className="flex flex-col gap-2.5">
          {linhas.map((l) => (
            <li key={l.mes} className="grid items-center gap-x-3 gap-y-1 grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_minmax(0,1fr)_12rem]">
              <span className="text-sm tabular-nums" style={{ color: "var(--ds-color-text-primary)" }}>
                {l.rotulo}
                <span className="block text-[11px]" style={cinza}>mês {l.n}</span>
              </span>
              <div className="relative h-3 rounded-full" style={{ background: "var(--ds-color-background-muted)" }} aria-hidden>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: pct(l.ust),
                    minWidth: l.ust > 0 ? 3 : 0,
                    background: l.parcial ? `repeating-linear-gradient(45deg, ${COR.info} 0 4px, color-mix(in srgb, ${COR.info} 45%, transparent) 4px 8px)` : COR[l.tom],
                  }}
                />
                {l.previsto && <div className="absolute -top-1 -bottom-1 w-0.5" style={{ left: pct(l.previsto), background: "var(--ds-color-text-primary)" }} title={`Previsto no TR: ${fmtNum(l.previsto)} UST`} />}
              </div>
              <span className="col-start-2 sm:col-start-auto text-sm tabular-nums sm:text-right" style={{ color: "var(--ds-color-text-secondary)" }}>
                <b style={{ color: "var(--ds-color-text-primary)" }}>{fmtNum(l.ust)}</b>
                {l.previsto ? ` de ${fmtNum(l.previsto)}` : ""}
                {l.parcial ? " · em andamento" : l.pct !== null ? ` · ${l.pct}%` : ""}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={cinza}>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block w-3 h-2 rounded-full" style={{ background: COR.critico }} />executado (cor = situação no mês)</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block w-0.5 h-3" style={{ background: "var(--ds-color-text-primary)" }} />previsto no TR</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block w-3 h-2 rounded-full" style={{ background: `repeating-linear-gradient(45deg, ${COR.info} 0 3px, transparent 3px 6px)` }} />mês em andamento</span>
        </div>
      </figure>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-xs max-w-[60ch]" style={cinza}>
          O mês é o da <b>Data da Execução</b> de cada tarefa, o dia em que o trabalho foi feito.
          {enganaFechamento && atual && (
            <> Pela data em que a X-VIA fechou as tarefas no TFS, {nomeLongo(atual.mes)} teria {fmtNum(atual.fechadoNoMes)} UST: ela fecha tarefas em lote, às vezes meses depois do trabalho.</>
          )}
        </div>
        <OrigemBotao origem={origem} />
      </div>
    </div>
  );
}
