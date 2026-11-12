import type { montarPorFeature } from "@/lib/cronograma";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import { fmtNum, type Origem } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import styles from "./gestao.module.css";

export function AcoesCronograma({ macro: m, onNavegar, conferirLigacoes }: { macro: ReturnType<typeof montarPorFeature>; onNavegar: NavegarProjeto; conferirLigacoes: () => void }) {
  const linhas = [
    { grupo: "atraso" as const, titulo: "Tratar atrasos de desenvolvimento", itens: m.aFazer.atrasos, motivo: "A sprint terminou e o trabalho continua aberto.", acao: "Confirmar o trabalho restante e a nova previsão." },
    { grupo: "cobrar" as const, titulo: "Destravar órgão, decisão ou impedimento", itens: m.aFazer.cobrar, motivo: "O quadro registra espera por validação, decisão ou impedimento.", acao: "Cobrar o encaminhamento com o responsável no registro." },
    { grupo: "replanejar" as const, titulo: "Replanejar o que não começou", itens: m.aFazer.replanejar, motivo: "A sprint venceu e o item continua em A fazer ou Área de Negócios.", acao: "Confirmar a prioridade antes de definir outra sprint." },
  ];
  const origem = (l: typeof linhas[number]): Origem => ({ rotulo: l.titulo, numero: `${l.itens.length} histórias da X-VIA`, detalhe: l.motivo, itens: l.itens, agruparPor: "epico" });
  return <section aria-label="Ações sobre o cronograma">
    <h2>O que fazer com os desvios?</h2>
    {!linhas.some((l) => l.itens.length > 0) && <p className={styles.ajuda}>Não há registros desses desvios da X-VIA nos filtros aplicados. Isso não avalia o projeto inteiro nem as outras frentes.</p>}
    <ul className={styles.comparacoes}>{linhas.filter((l) => l.itens.length > 0).map((l) => <li key={l.grupo}>
      <div className={styles.cabecalho}><h3>{l.titulo}: {fmtNum(l.itens.length)}</h3><OrigemBotao origem={origem(l)} /></div>
      <p className={styles.ajuda}>{l.motivo} {l.acao} Os números desta ação consideram a X-VIA.</p>
      {l.itens.length > 0 && <div className={styles.links}>
        <button type="button" onClick={() => onNavegar({ nivel: "gerente", aba: "prioridades", grupo: l.grupo, filtros: { frente: "X-VIA" }, alvo: "fila-gestao" })}>Tratar na Central de ação</button>
        <button type="button" onClick={() => onNavegar({ nivel: "detalhe", aba: "entregas", acao: l.grupo, filtros: { frente: "X-VIA" } })}>Consultar as entregas</button>
      </div>}
    </li>)}</ul>
    <p className={styles.conclusao}>{fmtNum(m.aFazer.invertidas.length)} ligações têm a predecessora planejada depois da entrega dependente. Essa contagem inclui as frentes presentes nos filtros.</p>
    {m.aFazer.invertidas.length > 0 && <button type="button" className={styles.link} onClick={conferirLigacoes}>Conferir as ligações e os responsáveis</button>}
  </section>;
}
