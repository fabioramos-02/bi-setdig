"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { filtrarOrdenarLinhas, paginarLinhas } from "@/lib/table-view";
import { ACAO_GESTAO, configurarFilaInicial, origemAcao, resumirFila, type AcaoGestao, type AcoesGerente } from "@/lib/xvia-gestao-acoes";
import { fmtNum, linkTfs, type Frente } from "@/lib/tfs";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import { OrigemBotao } from "./OrigemBotao";
import { ProblemaGestaoItem } from "./ProblemaGestaoItem";
import styles from "./gestao.module.css";

export function FilaGestao({ acoes, frenteFiltro, grupo, alvoId, onNavegar }: { acoes: AcoesGerente; frenteFiltro: string; grupo: AcaoGestao | ""; alvoId: number | null; onNavegar: NavegarProjeto }) {
  const inicial = configurarFilaInicial(acoes, alvoId, frenteFiltro);
  const [frente, setFrente] = useState<Frente>(inicial.frente);
  const [busca, setBusca] = useState("");
  const [todos, setTodos] = useState(inicial.todos);
  const [pagina, setPagina] = useState(inicial.pagina);
  const [imprimindo, setImprimindo] = useState(false);
  const listaRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const antes = () => flushSync(() => setImprimindo(true));
    const depois = () => setImprimindo(false);
    window.addEventListener("beforeprint", antes); window.addEventListener("afterprint", depois);
    return () => { window.removeEventListener("beforeprint", antes); window.removeEventListener("afterprint", depois); };
  }, []);
  const resumo = resumirFila(acoes, frente, grupo);
  const filtrados = filtrarOrdenarLinhas(resumo.problemas, busca, (p) => [p.item.id, p.item.titulo, p.item.epico, p.item.orgao, p.responsavel, p.motivo, ACAO_GESTAO[p.tipo].rotulo].join(" "));
  const paginada = paginarLinhas(filtrados, pagina, 10);
  const linhas = imprimindo ? filtrados : todos ? paginada.linhas : filtrados.slice(0, 5);
  const focarLista = () => requestAnimationFrame(() => { listaRef.current?.focus({ preventScroll: true }); listaRef.current?.scrollIntoView({ block: "start" }); });
  const trocarPagina = (n: number) => { setPagina(n); focarLista(); };
  const selecionarGrupo = (tipo: AcaoGestao | "") => onNavegar({ nivel: "gerente", aba: "prioridades", grupo: grupo === tipo ? "" : tipo, alvo: "fila-gestao" });
  return <section aria-label="Fila de gestão">
    <div className={styles.cabecalho}><p className={styles.conclusao}>{resumo.frase}</p>
    {!frenteFiltro && <div className={`${styles.frentes} print:hidden`} aria-label="Frente da fila">
      {(["X-VIA", "SGD"] as const).map((f) => <button key={f} type="button" aria-pressed={frente === f} onClick={() => { setFrente(f); setPagina(1); }}>{f}</button>)}
    </div>}
      <OrigemBotao origem={grupo ? origemAcao(acoes, grupo, frente) : { rotulo: "Registros da fila de gestão", numero: `${resumo.problemas.length} registros`, detalhe: resumo.escopo, itens: resumo.problemas.map((p) => p.item) }} />
    </div>
    <ul className={`${styles.grupos} print:hidden`} aria-label="Filtrar fila por ação">
      {resumo.grupos.filter((g) => g.total > 0).map((g) => <li key={g.tipo}><button type="button" aria-pressed={grupo === g.tipo} onClick={() => selecionarGrupo(g.tipo)}>{g.rotulo} ({fmtNum(g.total)}{g.tipo === "inversao" ? g.total === 1 ? " participante aberto" : " participantes abertos" : ""})</button></li>)}
    </ul>
    {grupo && <p className={styles.contexto}>Consulta: {ACAO_GESTAO[grupo].rotulo}. <button type="button" className={styles.link} onClick={() => selecionarGrupo("")}>Remover critério</button></p>}
    <details className="print:hidden"><summary className={styles.link}>Buscar na fila ou exportar</summary><div className={styles.controles}>
      <label><span>Buscar problema, pessoa, módulo ou órgão</span><input className="ds-input w-full" type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); setTodos(true); }} /></label>
      <ExportCsvButton filename="projeto-xvia-fila-gestao.csv" rows={filtrados.map((p) => ({ id: p.item.id, entrega: p.item.titulo, frente: p.item.frente, problema: ACAO_GESTAO[p.tipo].rotulo, motivo: p.motivo, acao: p.acao, responsavelNoRegistro: p.item.responsavel ?? "", modulo: p.item.epico ?? "", orgao: p.item.orgao ?? "", diasSemAtualizacao: p.item.diasSemAtualizar ?? "", sucessoresAbertos: p.seguintes.map((i) => i.id).join(", "), link: linkTfs(p.item.id) }))} />
    </div></details>
    <div className={styles.cabecalho}><p className={styles.ajuda} aria-live="polite">{fmtNum(filtrados.length)} registros encontrados{!todos && filtrados.length > 5 ? "; cinco principais abaixo" : todos && filtrados.length ? `; página ${paginada.pagina} de ${paginada.paginas}` : ""}.</p>
      {grupo && <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "detalhe", aba: "entregas", acao: grupo, filtros: { frente } })}>Consultar entregas deste grupo</button>}
    </div>
    <ol id="fila-gestao" tabIndex={-1} ref={listaRef} className={styles.problemas}>{linhas.map((p) => <ProblemaGestaoItem key={p.item.id} problema={p} />)}</ol>
    {!linhas.length && <p className={styles.vazio}>Nenhum registro corresponde aos filtros e à busca. Isso não avalia as entregas fora desta consulta.</p>}
    {frente === "Não identificado" && <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "detalhe", aba: "qualidade" })}>Conferir classificação dos registros</button>}
    {filtrados.length > 5 && <div className={`${styles.links} print:hidden`}>
      <button type="button" onClick={() => { setTodos(!todos); setPagina(1); focarLista(); }}>{todos ? "Mostrar cinco principais" : `Consultar todos os ${fmtNum(filtrados.length)} registros`}</button>
      {todos && paginada.paginas > 1 && <nav className={styles.links} aria-label="Páginas da fila">
        <button type="button" disabled={paginada.pagina === 1} onClick={() => trocarPagina(paginada.pagina - 1)}>Anterior</button>
        <span className={styles.ajuda}>Página {paginada.pagina} de {paginada.paginas}</span>
        <button type="button" disabled={paginada.pagina === paginada.paginas} onClick={() => trocarPagina(paginada.pagina + 1)}>Próxima</button>
      </nav>}
    </div>}
    <details className={styles.secundario}><summary>Como esta fila é organizada?</summary>
      <p className={styles.ajuda}>{resumo.escopo} Tempo sem atualização não mede permanência em uma coluna. O responsável do registro pode não ser o decisor.</p>
      <p className={styles.ajuda}>Decisão, impedimento, atraso do cronograma, revisão de dependência, validação do órgão, risco, replanejamento e falta de sprint, nessa ordem. Depois, demais pendências e prazo vencido. Em cada grupo, última atualização mais antiga primeiro. Não é uma pontuação de saúde.</p>
      <p className={styles.ajuda}>O motivo é o que o quadro e o planejamento permitem observar. A causa histórica e a decisão específica não são deduzidas. Ligações mostram apenas dependências entre histórias presentes nos filtros aplicados.</p>
    </details>
  </section>;
}
