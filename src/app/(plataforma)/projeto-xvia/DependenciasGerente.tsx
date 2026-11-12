import type { RefObject } from "react";
import type { montarPorFeature } from "@/lib/cronograma";
import { fmtNum, linkTfs } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import styles from "./gestao.module.css";

export function DependenciasGerente({ pares, alvo }: { pares: ReturnType<typeof montarPorFeature>["aFazer"]["invertidas"]; alvo: RefObject<HTMLDetailsElement | null> }) {
  return <details className={styles.secundario} ref={alvo} id="dependencias-planejadas" tabIndex={-1}>
    <summary>Conferir {fmtNum(pares.length)} ligações planejadas em ordem inversa</summary>
    <p className={styles.ajuda}>A ordem é a cadastrada nas sprints. Registros já concluídos também podem ter essa divergência de planejamento; isso não significa que continuam bloqueados.</p>
    <OrigemBotao origem={{ rotulo: "Ligações planejadas em ordem inversa", numero: `${pares.length} ligações`, detalhe: "Cada par vem dos vínculos de predecessora e sucessora. A sprint da predecessora está depois da sprint da entrega dependente.", itens: [...new Map(pares.flatMap((p) => [p.antes, p.depois]).map((p) => [p.id, p])).values()] }} />
    <ul className={styles.comparacoes}>{pares.map(({ antes, depois }) => <li key={`${antes.id}-${depois.id}`}>
      <h3><a className={styles.link} href={linkTfs(depois.id)} target="_blank" rel="noreferrer">{depois.titulo}</a> depende de <a className={styles.link} href={linkTfs(antes.id)} target="_blank" rel="noreferrer">{antes.titulo}</a>.</h3>
      <dl className={styles.metadados}>
        <div><dt>Predecessora · #{antes.id}</dt><dd>{antes.frente} · {antes.responsavel ?? "Responsável não informado"} · {antes.estado === "Done" ? "Concluída" : antes.coluna ?? antes.estado}</dd></div>
        <div><dt>Dependente · #{depois.id}</dt><dd>{depois.frente} · {depois.responsavel ?? "Responsável não informado"} · {depois.estado === "Done" ? "Concluída" : depois.coluna ?? depois.estado}</dd></div>
      </dl>
      <p className={styles.ajuda}>Ação: conferir a ordem das sprints e a necessidade de atualizar o planejamento com os responsáveis nos registros.</p>
    </li>)}</ul>
  </details>;
}
