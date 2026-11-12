import type { CSSProperties } from "react";
import { type Sinal, type Tom } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { COR } from "./comum";
import styles from "./projeto-xvia.module.css";

function ValorSinal({ sinal: s }: { sinal: Sinal }) {
  if (s.tom === "neutro") return <div className={`${styles.valor} ${styles.semBase}`}>{s.principal}</div>;
  if (s.id === "decisoes" || s.id === "entregas") {
    const [numero, ...texto] = s.principal.split(" ");
    return <div className={styles.valor}>{numero} <span className={styles.significado}>{texto.join(" ")}</span></div>;
  }
  return <div className={styles.valor}>
    {s.principal.replace(" nos filtros aplicados", "")}
    {s.principal.includes("nos filtros aplicados") && <span className={`${styles.significado} block`}>nos filtros aplicados</span>}
  </div>;
}

/** Situação geral em palavra: a cor do ponto nunca fala sozinha. */
const SITUACAO: Record<Tom, string> = { critico: "Crítico", atencao: "Atenção", ok: "No ritmo", info: "Sem comparação", neutro: "Sem base para avaliar" };

function Barras({ barras }: { barras: NonNullable<Sinal["barras"]> }) {
  return <div className={styles.barras}>
    {barras.map((b) => <div key={b.rotulo} className={styles.barraLinha}>
      <span>{b.rotulo}</span><span className={styles.barraPct}>{b.pct}%</span>
      <span aria-hidden className={styles.trilho}><span style={{ width: `${Math.min(100, Math.max(0, b.pct))}%` }} /></span>
    </div>)}
  </div>;
}

export function PainelSecretario({ cabecalho, frase, tom, sinais, onIrPara, titulo = "Situação do contrato" }: {
  cabecalho: string; frase: string; tom: Tom; sinais: Sinal[]; onIrPara: (aba: string) => void; titulo?: string;
}) {
  return (
    <section aria-label="Situação do contrato" className={styles.painel}>
      <h2>{titulo}</h2>
      <p className={styles.contexto}>{cabecalho}</p>
      <div className={styles.situacao}>
        <span className={styles.selo} style={{ "--sinal-cor": COR[tom] } as CSSProperties}>Situação: {SITUACAO[tom]}</span>
        {sinais.every((s) => s.tom === "neutro")
          ? <p className={styles.veredito}>{frase}</p>
          : <ul className={styles.frases}>{sinais.map((s) => <li key={s.id} className={styles.veredito}>
              <span aria-hidden className={styles.ponto} style={{ background: COR[s.tom] }} /><span>{s.resumo}</span>
            </li>)}</ul>}
      </div>
      <ul className={styles.sinais}>
        {sinais.map((s) => (
          <li key={s.id} className={`${styles.sinal} ${s.tom === "critico" || s.tom === "atencao" ? styles.sinalForte : styles.sinalLeve}`} style={{ "--sinal-cor": COR[s.tom] } as CSSProperties}>
            <h3>{s.rotulo}</h3>
            <span className={styles.palavra}>{s.palavra}</span>
            <ValorSinal sinal={s} />
            <div className={styles.comparacao}>{s.comparacao}</div>
            {s.barras && <Barras barras={s.barras} />}
            {s.id === "execucao" && s.tom !== "neutro" && <div className={styles.comparacao}>Mede o uso do contrato; não é pagamento nem percentual de conclusão.</div>}
            <div className={`${styles.acoesSinal} print:hidden`}>
              {s.acao && <button type="button" className={styles.link} onClick={() => onIrPara(s.acao!.aba)}>{s.acao.texto}</button>}
              <OrigemBotao origem={s.origem} />
            </div>
          </li>
        ))}
      </ul>
      <details className="bi-body print:hidden">
        <summary className="cursor-pointer">Como ler · UST = unidade de serviço técnico</summary>
        <p>Unidade de serviço técnico é a medida dos serviços contratados. Entregas em produção são comparadas ao prazo decorrido. A execução em unidades de serviço é comparada ao previsto no Termo de Referência; ela mede uso do contrato, sem representar pagamento ou percentual de conclusão. O indicador de atenção usa a última atualização dos registros, não o tempo exato de bloqueio. Itens da SGD ficam fora dos totais da contratada.</p>
      </details>
      <p className={`${styles.contexto} hidden print:block`}>UST = unidade de serviço técnico. A execução mede uso do contrato; não representa pagamento nem percentual de conclusão. Os totais da contratada excluem SGD e frente não identificada.</p>
    </section>
  );
}
