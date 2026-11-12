import { ACAO_GESTAO, type ProblemaGestao } from "@/lib/xvia-gestao-acoes";
import { fmtData } from "@/lib/tfs";
import { LinkItem } from "./comum";
import styles from "./gestao.module.css";

/** Uma situação de gestão: evidência, encaminhamento, dono do registro e ligações reais. */
export function ProblemaGestaoItem({ problema: p }: { problema: ProblemaGestao }) {
  return <li id={`prioridade-${p.item.id}`} tabIndex={-1} className={styles.problema}>
    <div><span className={styles.situacao} data-tipo={p.tipo}>{ACAO_GESTAO[p.tipo].rotulo}</span><span className={styles.ajuda}>{p.situacao} · {p.tempo}</span></div>
    <h3>{p.item.titulo}</h3>
    <p className="bi-body bi-narrative">{p.motivo}</p>
    <p className={styles.acao}>Ação: {p.acao}</p>
    <dl className={styles.metadados}>
      <div><dt>Responsável no registro</dt><dd>{p.responsavel}</dd></div>
      <div><dt>Módulo e órgão</dt><dd>{p.item.epico ?? "Módulo não informado"} · {p.item.orgao ?? "Órgão não informado"}</dd></div>
      <div><dt>Planejamento</dt><dd>{p.sprint}{p.fimSprint && ` · termina em ${fmtData(p.fimSprint)}`}{p.prazo && ` · prazo da entrega ${fmtData(p.prazo)}`}{p.squad && ` · ${p.squad}`}</dd></div>
    </dl>
    {p.seguintes.length > 0 && <div className={styles.impacto}><strong>{p.seguintes.length} {p.seguintes.length === 1 ? "entrega aberta depende" : "entregas abertas dependem"} deste item:</strong>
      <ul>{p.seguintes.map((i) => <li key={i.id}><LinkItem item={i} /></li>)}</ul>
    </div>}
    {p.anteriores.length > 0 && <details className={styles.impacto}><summary>Depende de {p.anteriores.length} {p.anteriores.length === 1 ? "entrega cadastrada" : "entregas cadastradas"}</summary>
      <ul>{p.anteriores.map((i) => <li key={i.id}><LinkItem item={i} /></li>)}</ul>
    </details>}
    <div className={`${styles.links} print:hidden`}><LinkItem item={p.item} semTitulo /><span className={styles.ajuda}>Registro original · {p.item.frente}{p.item.feature && ` · ${p.item.feature}`}</span></div>
    <p className={`${styles.ajuda} hidden print:block`}>Registro #{p.item.id} · {p.item.frente}{p.item.feature && ` · ${p.item.feature}`}</p>
  </li>;
}
