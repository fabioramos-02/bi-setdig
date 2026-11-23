import type { CSSProperties } from "react";
import type { TfsContrato } from "@/lib/tfs";
import type { prepararResumoXvia } from "@/lib/xvia-resumo";
import { respostasSecretario } from "@/lib/xvia-secretario";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import { COR } from "./comum";
import styles from "./projeto-xvia.module.css";

/** Visão do Secretário: as 5 perguntas do Robson, uma linha cada (pedido da Duda, 23/11/2026).
 * O detalhe fica na visão do Gerente; cada linha leva para lá. */
export function VisaoExecutiva({ resumo: r, onNavegar }: { resumo: ReturnType<typeof prepararResumoXvia>; contrato?: TfsContrato | null; onNavegar: NavegarProjeto }) {
  return <section aria-labelledby="t-secretario" className={styles.secretario}>
    <h2 id="t-secretario">Visão do Secretário</h2>
    <p className={styles.contexto}>{r.cabecalho}</p>
    <ol className={styles.respostas}>
      {respostasSecretario(r).map((x) => <li key={x.n} style={{ "--sinal-cor": COR[x.tom] } as CSSProperties}>
        <span className={styles.numero} aria-hidden>{x.n}</span>
        <div className={styles.pergunta}>
          <h3>{x.pergunta}</h3>
          <span className={styles.palavraResp}>{x.palavra}</span>
        </div>
        <p className={styles.resposta}>{x.resposta}</p>
        <button type="button" className={`${styles.link} print:hidden`} aria-label={`Ver detalhes: ${x.pergunta}`} onClick={() => onNavegar(x.destino)}>Ver detalhes</button>
      </li>)}
    </ol>
    <p className={styles.contexto}>UST = unidade de serviço técnico; mede o uso do contrato, não é pagamento nem percentual de conclusão. Só entram itens da X-VIA.</p>
  </section>;
}
