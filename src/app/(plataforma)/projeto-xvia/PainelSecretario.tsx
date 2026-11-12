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

export function PainelSecretario({ cabecalho, frase, tom, sinais, onIrPara, titulo = "Situação do contrato" }: {
  cabecalho: string; frase: string; tom: Tom; sinais: Sinal[]; onIrPara: (aba: string) => void; titulo?: string;
}) {
  return (
    <section aria-label="Situação do contrato" className={styles.painel}>
      <h2>{titulo}</h2>
      <p className={styles.contexto}>{cabecalho}</p>
      <div className={styles.veredito}>
        <span aria-hidden className={styles.ponto} style={{ background: COR[tom] }} />
        <span>{frase}</span>
      </div>
      <ul className={styles.sinais}>
        {sinais.map((s) => (
          <li key={s.id} className={styles.sinal} style={{ "--sinal-cor": COR[s.tom] } as CSSProperties}>
            <h3>{s.rotulo}</h3>
            <span className={styles.palavra}>{s.palavra}</span>
            <ValorSinal sinal={s} />
            <div className={styles.comparacao}>{s.comparacao}</div>
            <div className={`${styles.acoesSinal} print:hidden`}>
              {s.acao && <button type="button" className={styles.link} onClick={() => onIrPara(s.acao!.aba)}>{s.acao.texto}</button>}
              <OrigemBotao origem={s.origem} />
            </div>
          </li>
        ))}
      </ul>
      <details className="text-sm print:hidden">
        <summary className="cursor-pointer">Como ler · UST = unidade de serviço técnico</summary>
        <p>Unidade de serviço técnico é a medida dos serviços contratados. Entregas em produção são comparadas ao prazo decorrido. A execução em unidades de serviço é comparada ao previsto no Termo de Referência; ela mede uso do contrato, sem representar pagamento ou percentual de conclusão. O indicador de atenção usa a última atualização dos registros, não o tempo exato de bloqueio. Itens da SGD ficam fora dos totais da contratada.</p>
      </details>
      <p className={`${styles.contexto} hidden print:block`}>UST = unidade de serviço técnico. A execução mede uso do contrato; não representa pagamento nem percentual de conclusão. Os totais da contratada excluem SGD e frente não identificada.</p>
    </section>
  );
}
