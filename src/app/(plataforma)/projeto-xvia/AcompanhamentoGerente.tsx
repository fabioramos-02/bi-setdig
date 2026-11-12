import type { GestaoProjeto } from "@/lib/xvia-gestao";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import { fmtData, fmtNum } from "@/lib/tfs";
import styles from "./gestao.module.css";

export function AcompanhamentoGerente({ gestao: g, onNavegar }: { gestao: GestaoProjeto; onNavegar: NavegarProjeto }) {
  return <div className={styles.duasColunas}>
    <section><h2>Onde acompanhar o projeto?</h2><ul className={styles.comparacoes}>
      {g.modulos.slice(0, 3).map((m) => <li key={m.epico}>
        <div className={styles.cabecalho}><h3>{m.epico}</h3><span className={styles.situacao}>{m.situacao}</span></div>
        <p className={styles.contexto}>{fmtNum(m.emProducao)} de {fmtNum(m.total)} entregas em produção.</p>
        <ul className={styles.motivos}>{m.motivos.slice(0, 3).map((a) => <li key={a.tipo}>{fmtNum(a.itens.length)} · {a.rotulo.toLowerCase()}</li>)}</ul>
        <p className={styles.ajuda}>{m.acao}</p>
        <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "gerente", aba: "cronograma", filtros: { modulo: m.epico } })}>Acompanhar {m.epico}</button>
      </li>)}
      {!g.modulos.length && <li className={styles.vazio}>Não há módulos nos filtros aplicados.</li>}
    </ul><button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "gerente", aba: "modulos" })}>Comparar todos os módulos</button></section>
    <div className={styles.pagina}>
      <section><h2>O que falta na sprint acompanhada?</h2><p className={styles.conclusao}>{g.sprint.frase}</p>
        {g.sprint.atual && <p className={styles.contexto}>{fmtData(g.sprint.atual.inicio)} a {fmtData(g.sprint.atual.fim)}. A sprint é a identificada na atualização dos dados.</p>}
        {g.sprint.itens.length > 0 && <p className={styles.ajuda}>{fmtNum(g.sprint.fila.length)} ainda na fila, {fmtNum(g.sprint.andamento.length)} em desenvolvimento/homologação e {fmtNum(g.sprint.esperando.length)} esperando validação, decisão ou solução de impedimento.</p>}
        <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "gerente", aba: "fiscalizacao" })}>Acompanhar a sprint</button>
      </section>
      <section><h2>Como está o consumo do contrato?</h2><p className={styles.conclusao}>{g.execucao.frase}</p>
        {!g.execucao.temRegistros && <p className={styles.ajuda}>Aceite, faturamento e pagamento não informados. É necessário obter os registros financeiros para acompanhar essas etapas.</p>}
        <div className={styles.links}><button type="button" onClick={() => onNavegar({ nivel: "gerente", aba: "financeiro" })}>Ver concentração do esforço</button><button type="button" onClick={() => onNavegar({ nivel: "detalhe", aba: "ust" })}>Conferir a composição em UST</button></div>
      </section>
    </div>
  </div>;
}
