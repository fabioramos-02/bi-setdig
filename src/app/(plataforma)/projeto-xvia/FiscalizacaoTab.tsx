"use client";
import { useState } from "react";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { filtrarSprint, type SprintGestao } from "@/lib/xvia-gestao";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import { fmtData, fmtNum, type Ans, type TfsItem, type bugsDoQa } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { SlaSecao } from "./SlaSecao";
import { LinkItem } from "./comum";
import styles from "./gestao.module.css";

const colunas: Coluna<TfsItem>[] = [
  { key: "situacao", label: "Situação", sortable: true, sortValue: (r) => r.coluna ?? r.estado, render: (r) => r.coluna ?? r.estado },
  { key: "entrega", label: "Entrega", sortable: true, sortValue: (r) => r.titulo, render: (r) => <LinkItem item={r} /> },
  { key: "responsavel", label: "Responsável no registro", render: (r) => r.responsavel ?? "Não informado" },
  { key: "frente", label: "Frente", sortable: true, sortValue: (r) => r.frente, render: (r) => r.frente },
  { key: "modulo", label: "Módulo", render: (r) => r.epico ?? "Não informado" },
  { key: "data", label: "Data registrada", render: (r) => r.fechadoEm ? `Concluída em ${fmtData(r.fechadoEm)}` : r.prazo ? `Prazo: ${fmtData(r.prazo)}` : "Não informada" },
];

export function FiscalizacaoTab({ dados: d, ans, bugs, contexto, onNavegar }: { dados: SprintGestao; ans: Ans | null; bugs: ReturnType<typeof bugsDoQa>; contexto: string; onNavegar: NavegarProjeto }) {
  const [coluna, setColuna] = useState("");
  const tabela = (itens: TfsItem[], label: string) => <DataTable horizontalScroll pageSize={25} label={label} searchText={(r) => [r.id, r.titulo, r.responsavel, r.epico, r.frente, r.coluna].join(" ")} columns={colunas} rows={itens} rowKey={(r) => String(r.id)} />;
  return <div className={styles.pagina}>
    <header><h2>O que falta na sprint acompanhada?</h2><p className={styles.contexto}>{contexto}</p><p className={styles.conclusao}>{d.frase}</p>
      {d.atual && <p className={styles.ajuda}>{d.atual.nome}: de {fmtData(d.atual.inicio)} a {fmtData(d.atual.fim)}. A sprint é a identificada no retrato; não é uma previsão de conclusão.</p>}
    </header>
    {d.itens.length > 0 && <section aria-label="Sinais observáveis da sprint">
      <dl className={styles.sprintDados}><div><dt>Em produção</dt><dd>{fmtNum(d.producao.length)} de {fmtNum(d.itens.length)}</dd></div><div><dt>Ainda na fila</dt><dd>{fmtNum(d.fila.length)}</dd></div><div><dt>Em desenvolvimento / homologação</dt><dd>{fmtNum(d.andamento.length)}</dd></div><div><dt>Esperando encaminhamento</dt><dd>{fmtNum(d.esperando.length)}</dd></div></dl>
      <p className={styles.conclusao}>{d.fila.length ? "Confirme a prioridade do que permanece na fila antes de transferir trabalho para outra sprint." : d.esperando.length ? "Confirme os encaminhamentos pendentes antes de pactuar a próxima entrega." : "Acompanhe as entregas abertas e confirme a atualização dos registros com o time."}</p>
      <p className={styles.ajuda}>A fila reúne A fazer e Área de Negócios; isso difere de trabalho em sprint vencida que não começou. Produção, fila, desenvolvimento e espera são sinais do quadro. {d.outras.length > 0 && `${fmtNum(d.outras.length)} entregas abertas estão em outras etapas.`} {d.risco.length > 0 && `${fmtNum(d.risco.length)} histórias desta sprint têm risco por dependência.`}</p>
      <div className={styles.links}><OrigemBotao origem={{ rotulo: "Entregas da sprint acompanhada", numero: `${d.itens.length} entregas`, detalhe: "Histórias e falhas vinculadas à sprint marcada como atual nos dados, nos filtros aplicados.", itens: d.itens, agruparPor: "coluna" }} />
        {d.atual && <button type="button" onClick={() => onNavegar({ nivel: "gerente", aba: "prioridades", filtros: { sprint: d.atual!.sprint } })}>Ver ações desta sprint</button>}
      </div>
    </section>}
    <details className={styles.secundario}><summary>Consultar as {fmtNum(d.itens.length)} entregas da sprint</summary>
      <label className="block mb-4 text-sm">Etapa do quadro<select className="ds-select" value={coluna} onChange={(e) => setColuna(e.target.value)}><option value="">Todas as etapas</option>{d.porColuna.map((c) => <option key={c.coluna} value={c.coluna}>{c.coluna} ({c.total})</option>)}</select></label>
      {tabela(filtrarSprint(d, coluna), "Entregas da sprint")}
    </details>
    {d.proxima && <section><h2>Qual é o próximo compromisso?</h2><p className={styles.conclusao}>{d.proxima.nome}: {fmtData(d.proxima.inicio)} a {fmtData(d.proxima.fim)}, com {fmtNum(d.proximas.length)} entregas cadastradas nos filtros aplicados.</p><button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "detalhe", aba: "entregas", filtros: { sprint: d.proxima!.sprint } })}>Consultar entregas da próxima sprint</button></section>}
    <section><h2>O aceite e o suporte estão medidos?</h2><p className={styles.ajuda}>O aceite formal depende dos registros financeiros. {ans?.medicao ? `Há medição dos prazos de atendimento em ${ans.medicao.mes}.` : "Os prazos de atendimento do contrato continuam sem medição. É necessário solicitar o relatório à X-VIA."}</p>
      <details className={styles.secundario}><summary>Consultar compromissos de atendimento e qualidade do desenvolvimento</summary><div id="prazos-atendimento" tabIndex={-1}><SlaSecao ans={ans} bugs={bugs} onIrPara={(aba) => onNavegar({ nivel: "gerente", aba: aba === "cronograma" ? "cronograma" : "fiscalizacao" })} /></div></details>
      <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "detalhe", aba: "registros" })}>Conferir registros de aceite</button>
    </section>
    <details className={styles.secundario}><summary>Consultar histórico de {d.mesLabel}: {fmtNum(d.totalMes)} concluídas</summary><p className={styles.ajuda}>Histórias e falhas das frentes presentes nos filtros. O mês considera a data de fechamento da entrega; isso não é a Data da Execução usada para UST.</p>{d.historico.map((g) => <section key={g.sprint}><h3>{g.sprint.split("\\").pop()} · {fmtNum(g.itens.length)} entregas</h3>{tabela(g.itens, "Entregas concluídas no mês")}</section>)}</details>
    <details className={styles.secundario}><summary>Consultar tudo que está em produção: {fmtNum(d.producaoProjeto.length)} entregas</summary><p className={styles.ajuda}>Inclui histórias e falhas das frentes presentes nos filtros; o resumo do Secretário conta somente a X-VIA.</p>{tabela(d.producaoProjeto, "Entregas em produção")}</details>
  </div>;
}
