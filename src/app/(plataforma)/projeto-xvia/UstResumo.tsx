import { fmtNum, fmtReais, type execucaoXvia, type Origem, type TfsItem, type Tom } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { COR, Sigla } from "./comum";
import type { CSSProperties } from "react";
import styles from "./tipografia.module.css";

type Execucao = ReturnType<typeof execucaoXvia>;
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
const fundo = (tom: Tom) => `color-mix(in srgb, ${COR[tom]} 8%, var(--ds-color-background))`;

/** Topo do Detalhamento A — "quanto do contrato a X-VIA já usou e o que no dado pede atenção".
 * O concluído vem primeiro (é o que o contrato paga); a barra mostra o contrato inteiro; as
 * limitações do dado ficam em chips perto do número, cada um com a lista; a regra fica recolhida. */
export function UstResumo({ f }: { f: Execucao }) {
  const total = f.ustTotal ?? 0;
  const aberta = f.ustLancada - f.ustExecutada;
  const livre = Math.max(total - f.ustLancada, 0);
  const somadas = f.porCodigo.flatMap((l) => l.itens);
  const valorDe = (t: TfsItem) => f.porCodigo.find((l) => l.itens.includes(t))?.ustUnitaria ?? null;
  const estourados = f.porCodigo.filter((l) => l.previsto > 0 && l.lancada > l.previsto);
  const foraEtp = f.porCodigo.filter((l) => l.previsto === 0 && l.tarefas > 0);

  const origem = (rotulo: string, itens: TfsItem[], detalhe: string, numero: string): Origem => ({
    rotulo, numero, detalhe, itens, agruparPor: "epico", fonte: "TFS: tarefas da X-VIA",
    valor: { rotulo: "UST", de: (t) => t.ust ?? valorDe(t) },
  });
  const chips: { tom: Tom; titulo: string; texto: React.ReactNode; origem: Origem }[] = [];
  if (estourados.length)
    chips.push({
      tom: "critico",
      titulo: `${fmtNum(estourados.length)} ${estourados.length === 1 ? "atividade passou" : "atividades passaram"} do previsto no ETP`,
      texto: <>
        <ul className={styles.atividades}>{estourados.map((l) => <li key={l.codigo}>{l.codigo}: {fmtNum(l.lancada)} UST lançadas para {fmtNum(l.previsto)} previstas.</li>)}</ul>
        <details className={styles.nomes}><summary>Consultar nomes das atividades</summary><ul className={styles.atividades}>{estourados.map((l) => <li key={l.codigo}>{l.codigo} — {l.servico}</li>)}</ul></details>
      </>,
      origem: origem("Tarefas das atividades acima do previsto", estourados.flatMap((l) => l.itens), "Atividades em que a UST lançada já passou do previsto na memória de cálculo do ETP.", `${fmtNum(estourados.length)} atividades acima do previsto`),
    });
  if (f.semContrato)
    chips.push({
      tom: "atencao",
      titulo: `${fmtNum(f.semContrato)} tarefas sem a atividade marcada no TFS`,
      texto: "A soma usa o código escrito na descrição da tarefa. A X-VIA precisa marcar a atividade no registro.",
      origem: origem("Tarefas sem atividade marcada", somadas.filter((t) => !t.empresa), "Tarefas somadas pelo código escrito na descrição, sem o contrato e a atividade marcados no TFS.", `${fmtNum(f.semContrato)} tarefas sem atividade marcada`),
    });
  if (f.foraDoEtp)
    chips.push({
      tom: "info",
      titulo: `${fmtNum(f.foraDoEtp)} tarefas com atividade fora do ETP`,
      texto: `Atividades do catálogo da X-VIA que a memória de cálculo do ETP não previa: contam, com previsto zero (${foraEtp.map((l) => l.codigo).slice(0, 6).join(", ")}${foraEtp.length > 6 ? "…" : ""}).`,
      origem: origem("Tarefas com atividade fora do ETP", foraEtp.flatMap((l) => l.itens), "Atividades válidas no catálogo da X-VIA, sem previsão no ETP.", `${fmtNum(f.foraDoEtp)} tarefas fora do ETP`),
    });
  if (f.aClassificar.length)
    chips.push({
      tom: "atencao",
      titulo: `${fmtNum(f.aClassificar.length)} tarefas fora da soma`,
      texto: `Sem código válido do catálogo: ${fmtNum(f.contagemAClassificar["sem código"])} sem código, ${fmtNum(f.contagemAClassificar["faixa a definir"])} com faixa a definir, ${fmtNum(f.contagemAClassificar["fora do ETP"])} com código inexistente.`,
      origem: origem("Tarefas fora da soma", f.aClassificar, "Tarefas da X-VIA sem código válido do catálogo: não entram na UST até a X-VIA corrigir.", `${fmtNum(f.aClassificar.length)} tarefas fora da soma`),
    });
  if (f.valorDoEtp)
    chips.push({
      tom: "neutro",
      titulo: `${fmtNum(f.valorDoEtp)} tarefas com valor provisório`,
      texto: "Usam a UST do ETP porque o catálogo da X-VIA ainda não tem o valor da atividade.",
      origem: origem("Tarefas com valor provisório", somadas.filter((t) => t.ust === null), "O valor vem da tabela do ETP até o catálogo da X-VIA trazer o da atividade.", `${fmtNum(f.valorDoEtp)} tarefas com valor provisório`),
    });

  const faixas = [
    { rotulo: "Concluído", n: f.ustExecutada, cor: "var(--ds-color-primary-600)" },
    { rotulo: "Em tarefas abertas", n: aberta, cor: "color-mix(in srgb, var(--ds-color-primary-600) 40%, var(--ds-color-background))" },
    { rotulo: "Ainda sem tarefa", n: livre, cor: "var(--ds-color-background-muted)" },
  ];

  return (
    <section aria-labelledby="ust-resumo-titulo" className={styles.resumo}>
      <h2 id="ust-resumo-titulo" className="bi-heading-1">Quanto do contrato já foi executado?</h2>
      <div className={styles.destaque}>
        <p className="bi-headline bi-narrative">
          A X-VIA concluiu <span className="tabular-nums">{fmtNum(f.ustExecutada)}</span> <Sigla s="UST" />
        </p>
        <p className={`${styles.referencia} bi-narrative`}><span className="tabular-nums">{fmtNum(pct(f.ustExecutada, total))}% das {fmtNum(total)} UST contratadas</span>{f.valorExecutado !== null && <> · {fmtReais(f.valorExecutado)} em valor calculado</>}</p>
        <p className="bi-body bi-narrative">Outras {fmtNum(aberta)} UST estão em tarefas abertas. Ainda não há tarefas para {fmtNum(livre)} UST do contrato.</p>

        <div className="mt-4" role="img" aria-label={faixas.map((x) => `${x.rotulo}: ${fmtNum(x.n)} UST`).join("; ")}>
          <div className="flex h-4 w-full overflow-hidden" style={{ borderRadius: 9999, background: "var(--ds-color-background-muted)", border: "1px solid var(--ds-color-border)" }}>
            {faixas.map((x) => <div key={x.rotulo} style={{ width: `${pct(x.n, total)}%`, background: x.cor, minWidth: x.n > 0 ? 2 : 0 }} />)}
          </div>
          <div className={styles.legenda}>
            {faixas.map((x) => (
              <span key={x.rotulo} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block w-3 h-3 rounded-sm" style={{ background: x.cor, border: "1px solid var(--ds-color-border)" }} />
                {x.rotulo}: <span className="tabular-nums" style={{ color: "var(--ds-color-text-primary)" }}>{fmtNum(x.n)}</span> ({fmtNum(pct(x.n, total))}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <div>
          <h2 className="bi-heading-1">Pontos de atenção no dado</h2>
          <ul className={styles.alertas}>
            {chips.map((c) => (
              <li key={c.titulo} className={styles.alerta} style={{ "--alerta-cor": COR[c.tom], "--alerta-fundo": fundo(c.tom) } as CSSProperties}>
                <h3 className="bi-card-title">{c.titulo}</h3>
                <div className="bi-body" style={{ color: "var(--ds-color-text-secondary)" }}>{c.texto}</div>
                <div><OrigemBotao origem={c.origem} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="bi-body bi-narrative" style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", padding: "var(--ds-spacing-16)" }}>
        <summary className="cursor-pointer font-medium" style={{ color: "var(--ds-color-text-secondary)" }}>Como ler estes números</summary>
        <ul className="mt-2 flex flex-col gap-1.5" style={{ color: "var(--ds-color-text-secondary)" }}>
          <li><b>Quem entra:</b> só tarefa da X-VIA, com o contrato da X-VIA marcado ou na área que a X-VIA fatura. Tarefa da SGD ou sem frente identificada fica fora.</li>
          <li><b>Quanto vale:</b> cada tarefa vale a UST da atividade do catálogo da X-VIA.</li>
          <li><b>Lançada e concluída:</b> lançada é toda tarefa com atividade; concluída é só a que terminou.</li>
          <li><b>Previsto:</b> as ocorrências da memória de cálculo do <Sigla s="ETP" />.</li>
        </ul>
      </details>
    </section>
  );
}
