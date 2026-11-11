import { PALAVRA_TOM, type Sinal, type Tom } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { COR, Sigla } from "./comum";

const fundo = (tom: Tom) => `color-mix(in srgb, ${COR[tom]} 7%, var(--ds-color-background))`;

/** Barra fina; a de referência (prazo) fica sobreposta, como linha. */
function Barras({ barras, tom }: { barras: NonNullable<Sinal["barras"]>; tom: Tom }) {
  const [principal, referencia] = barras;
  return (
    <div className="mt-2" aria-hidden>
      <div className="relative h-2 rounded-full" style={{ background: "var(--ds-color-border)" }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, principal.pct)}%`, background: COR[tom] }} />
        {referencia && <div className="absolute -top-1 -bottom-1 w-0.5" style={{ left: `${Math.min(100, referencia.pct)}%`, background: "var(--ds-color-text-primary)" }} />}
      </div>
      <div className="mt-1 flex justify-between text-[11px]" style={{ color: "var(--ds-color-text-muted)" }}>
        <span>{principal.rotulo}: {principal.pct}%</span>
        {referencia && <span>▏{referencia.rotulo}: {referencia.pct}%</span>}
      </div>
    </div>
  );
}

const ComoLer = () => (
  <ul className="mt-2 flex flex-col gap-1.5" style={{ color: "var(--ds-color-text-secondary)" }}>
          <li><b>Entregas:</b> quanto do planejado já está em produção, comparado com quanto do prazo já passou. Andar junto = {PALAVRA_TOM.ok}.</li>
          <li><b>Execução:</b> quanto a X-VIA já executou em <Sigla s="UST" />, comparado com o que o <Sigla s="TR" /> previa até este mês. Execução baixa não é atraso de entrega: mede o uso do contrato.</li>
          <li><b>Decisões:</b> entregas paradas esperando alguém decidir, destravar ou resolver uma dependência.</li>
          <li>Só entram tarefas e entregas da X-VIA; as da <Sigla s="SGD" /> aparecem à parte. Em &quot;De onde vem?&quot; está a conta e cada item do TFS.</li>
        </ul>
);

/** Topo do relatório do Secretário: uma frase que diz se está bom ou ruim, e três sinais que a
 * sustentam — cada um com número, base de comparação, de onde vem e o que fazer. A cor nunca é
 * a única pista: a palavra do tom vem junto. */
export function PainelSecretario({ cabecalho, frase, tom, sinais, onIrPara }: {
  cabecalho: string; frase: string; tom: Tom; sinais: Sinal[]; onIrPara: (aba: string) => void;
}) {
  return (
    <section aria-label="Situação do contrato" className="break-inside-avoid" style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", background: "var(--ds-color-background)" }}>
      <div className="px-5 pt-4 pb-3 text-xs font-semibold uppercase" style={{ letterSpacing: "0.08em", color: "var(--ds-color-text-secondary)", borderBottom: "1px solid var(--ds-color-border)" }}>
        {cabecalho}
      </div>

      <div className="px-5 pt-4 pb-4 flex gap-3 items-start font-semibold" style={{ fontSize: "1.35rem", lineHeight: 1.35, color: "var(--ds-color-text-primary)" }}>
        <span aria-hidden className="mt-2.5 shrink-0 rounded-full" style={{ width: 12, height: 12, background: COR[tom] }} />
        <span>{frase}</span>
      </div>

      <ul className="flex flex-col">
        {sinais.map((s) => (
          <li key={s.id} className="grid gap-x-5 gap-y-2 px-5 py-4 md:grid-cols-[11rem_minmax(0,1fr)_auto] md:items-center"
            style={{ borderTop: "1px solid var(--ds-color-border)", borderLeft: `4px solid ${COR[s.tom]}`, background: fundo(s.tom) }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>{s.rotulo}</div>
              <div className="text-xs font-semibold uppercase" style={{ letterSpacing: "0.05em", color: COR[s.tom] }}>{s.palavra}</div>
            </div>
            <div className="min-w-0">
              <div className="font-semibold tabular-nums" style={{ fontSize: "1.6rem", lineHeight: 1.15, color: "var(--ds-color-text-primary)" }}>{s.principal}</div>
              <div className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>{s.comparacao}</div>
              {s.barras && <Barras barras={s.barras} tom={s.tom} />}
            </div>
            <div className="flex md:flex-col md:items-end gap-x-4 gap-y-1 print:hidden">
              {s.acao && (
                <button type="button" onClick={() => onIrPara(s.acao!.aba)} className="text-sm font-medium underline" style={{ color: "var(--ds-color-primary-600)" }}>
                  {s.acao.texto} →
                </button>
              )}
              <OrigemBotao origem={s.origem} />
            </div>
          </li>
        ))}
      </ul>

      <details className="px-5 py-3 text-sm print:hidden" style={{ borderTop: "1px solid var(--ds-color-border)" }}>
        <summary className="cursor-pointer font-medium" style={{ color: "var(--ds-color-text-secondary)" }}>Como ler estes números</summary>
        <ComoLer />
      </details>
      {/* Na impressão o "Como ler" sai aberto. */}
      <div className="hidden print:block px-5 py-3 text-sm" style={{ borderTop: "1px solid var(--ds-color-border)" }}><b>Como ler estes números</b><ComoLer /></div>
    </section>
  );
}
