"use client";
import { useEffect, useRef, useState } from "react";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { prepararOrgaoGestao, type ExecucaoGestao } from "@/lib/xvia-gestao";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import { fmtNum, fmtReais, type Financeiro, type LinhaServico, type Origem } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { TabelaCadeia } from "./CadeiaFinanceira";
import { DocumentosOrgao } from "./DocumentosOrgao";
import { LinkItem } from "./comum";
import styles from "./gestao.module.css";

type Orgao = ExecucaoGestao["orgaos"][number];
const colOrgao: Coluna<Orgao>[] = [
  { key: "orgao", label: "Órgão", sortable: true, sortValue: (r) => r.orgao, render: (r) => r.orgao },
  { key: "ust", label: "UST executadas", align: "right", sortable: true, sortValue: (r) => r.ustExecutada, render: (r) => fmtNum(r.ustExecutada) },
  { key: "parte", label: "Participação na execução", align: "right", sortable: true, sortValue: (r) => r.pct ?? -1, render: (r) => r.pct == null ? "Sem base" : `${fmtNum(r.pct)}%` },
  { key: "valor", label: "Valor calculado", align: "right", sortable: true, sortValue: (r) => r.valorConsumido ?? -1, render: (r) => r.valorConsumido == null ? "Não informado" : fmtReais(r.valorConsumido) },
];
const colServico: Coluna<LinhaServico>[] = [
  { key: "servico", label: "Serviço", sortable: true, sortValue: (r) => r.servico, render: (r) => r.pbiId ? <LinkItem item={{ id: r.pbiId, titulo: r.servico }} /> : r.servico },
  { key: "ust", label: "UST executadas", align: "right", sortable: true, sortValue: (r) => r.ustExecutada, render: (r) => fmtNum(r.ustExecutada) },
  { key: "valor", label: "Valor calculado", align: "right", render: (r) => r.valorConsumido == null ? "Não informado" : fmtReais(r.valorConsumido) },
  { key: "origem", label: "Composição", render: (r) => <OrigemBotao origem={{ rotulo: `Tarefas de ${r.servico}`, detalhe: "Tarefas concluídas da X-VIA com atividade válida, ligadas ao serviço.", itens: r.tarefas }} /> },
];

export function FinanceiroTab({ dados: d, financeiro, contexto, origemExecucao, onNavegar }: { dados: ExecucaoGestao; financeiro: Financeiro | null; contexto: string; origemExecucao?: Origem; onNavegar: NavegarProjeto }) {
  const [nomeOrgao, setNomeOrgao] = useState<string | null>(null);
  const orgao = prepararOrgaoGestao(d, financeiro, nomeOrgao);
  const detalheRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!nomeOrgao) return;
    const id = requestAnimationFrame(() => { detalheRef.current?.focus({ preventScroll: true }); detalheRef.current?.scrollIntoView({ block: "start" }); });
    return () => cancelAnimationFrame(id);
  }, [nomeOrgao]);
  return <div className={styles.pagina}>
    <header><h2>Quanto trabalho contratado foi consumido?</h2><p className={styles.contexto}>{contexto}</p><p className={styles.conclusao}>{d.frase}</p>
      <p className={styles.ajuda}>UST significa unidade de serviço técnico. Quantidade executada é trabalho concluído registrado, sem representar percentual de conclusão do projeto.</p>
      <div className={styles.links}>{origemExecucao && <OrigemBotao origem={origemExecucao} />}<button type="button" onClick={() => onNavegar({ nivel: "detalhe", aba: "ust" })}>Conferir atividades e tarefas</button></div>
    </header>
    <section><h2>Onde está concentrado o esforço?</h2><p className={styles.conclusao}>{d.concentracao}</p>
      <p className={styles.ajuda}>Participação calculada sobre toda a execução nos filtros aplicados, incluindo tarefas sem órgão identificado. Maior consumo não significa problema.</p>
      {d.semOrgao && d.semOrgao.ustExecutada > 0 && <p className={styles.acao}><strong>{fmtNum(d.semOrgao.ustExecutada)} UST ({fmtNum(d.semOrgao.pct ?? 0)}%) estão sem órgão identificado.</strong> Atribuição incompleta limita a análise por órgão. <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "detalhe", aba: "qualidade" })}>Conferir atribuição de órgãos</button></p>}
      <DataTable horizontalScroll label="Órgãos com execução" columns={colOrgao} rows={d.orgaos} rowKey={(r) => r.orgao} onRowClick={(r) => setNomeOrgao(r.orgao === nomeOrgao ? null : r.orgao)} />
    </section>
    {orgao && <section><h3 ref={detalheRef} tabIndex={-1}>{orgao.orgao}: serviços que compõem o consumo</h3>
      <p className={styles.contexto}>{fmtNum(orgao.ustExecutada)} UST no órgão. Clique no nome do serviço para conferir o registro original; a composição apresenta as tarefas.</p>
      <DataTable horizontalScroll label={`Serviços de ${orgao.orgao}`} columns={colServico} rows={orgao.servicos} rowKey={(r) => String(r.pbiId ?? r.servico)} />
      {d.temRegistros && <DocumentosOrgao orgao={orgao} />}
    </section>}
    <section><h2>O que foi aceito, faturado e pago?</h2>
      <p className={styles.ajuda}>Ordens de Serviço, aceites, notas e pagamentos são registros independentes do contrato inteiro. Não acompanham os quatro filtros dos itens. Execução técnica segue os filtros aplicados.</p>
      {d.temRegistros ? <TabelaCadeia cadeia={d.cadeia} /> : <>
        <p className={styles.conclusao}>Aceite, faturamento e pagamento não informados. Ainda não há registros financeiros para acompanhar essas etapas.</p>
        <p className={styles.ajuda}>Solicitar os documentos de origem à equipe financeira e registrar cada etapa. Trabalho concluído não comprova aceite nem pagamento.</p>
        <details className={styles.secundario}><summary>Consultar todas as etapas e suas referências</summary><TabelaCadeia cadeia={d.cadeia} /></details>
      </>}
      <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "detalhe", aba: "registros" })}>Conferir os registros financeiros do contrato</button>
    </section>
  </div>;
}
