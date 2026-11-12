"use client";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { useState } from "react";
import { filtrarOrdenarLinhas } from "@/lib/table-view";
import type { ModuloGestao } from "@/lib/xvia-gestao";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import styles from "./gestao.module.css";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { fmtData, fmtNum, TIPOS_ENTREGA, type LinhaModulo } from "@/lib/tfs";
import type { Filtrar } from "./ProjetoXviaClient";

type Linha = LinhaModulo & { atrasadas: number; dependencias: number };

const colunas: Coluna<Linha>[] = [
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico, render: (r) => r.epico },
  { key: "total", label: "Entregas", align: "right", sortable: true, sortValue: (r) => r.total, render: (r) => fmtNum(r.total) },
  { key: "xvia", label: "Frente X-VIA", align: "right", sortable: true, sortValue: (r) => r.xvia, render: (r) => fmtNum(r.xvia) },
  { key: "sgd", label: "Frente SGD", align: "right", sortable: true, sortValue: (r) => r.sgd, render: (r) => fmtNum(r.sgd) },
  ...TIPOS_ENTREGA.map((t): Coluna<Linha> => ({
    key: t, label: t, align: "right", sortable: true, sortValue: (r) => r.porTipo[t], render: (r) => fmtNum(r.porTipo[t]),
  })),
  { key: "producao", label: "Em produção", align: "right", sortable: true, sortValue: (r) => r.emProducao, render: (r) => fmtNum(r.emProducao) },
  { key: "atrasadas", label: "Atrasadas", align: "right", sortable: true, sortValue: (r) => r.atrasadas, render: (r) => fmtNum(r.atrasadas) },
  { key: "pend", label: "Pendências", align: "right", sortable: true, sortValue: (r) => r.pendencias, render: (r) => fmtNum(r.pendencias) },
  { key: "dep", label: "Dependências ligadas", align: "right", sortable: true, sortValue: (r) => r.dependencias, render: (r) => fmtNum(r.dependencias) },
];

export function ModulosTab({ modulos, contexto, filtrar, onNavegar }: { modulos: ModuloGestao[]; contexto: string; filtrar: Filtrar; onNavegar: NavegarProjeto }) {
  const [busca, setBusca] = useState("");
  const linhas = filtrarOrdenarLinhas(modulos, busca, (m) => m.epico);
  return <div className={styles.pagina}>
    <header><h2>Quais módulos pedem intervenção?</h2><p className={styles.contexto}>{contexto}</p><p className={styles.conclusao}>Decisões e impedimentos têm precedência nesta comparação. Cada módulo mostra o motivo observado e o próximo encaminhamento, sem pontuação de saúde.</p></header>
    <label className="print:hidden"><span className={styles.ajuda}>Localizar módulo</span><input type="search" className="ds-input w-full" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
    <p className={styles.ajuda}>Produção inclui histórias e falhas; o cronograma acompanha apenas histórias. A situação do cronograma é a mais grave entre as histórias abertas. X-VIA e SGD estão identificadas nos números abaixo.</p>
    <ul className={`${styles.comparacoes} ${styles.gradeModulos}`}>{linhas.map((m) => <li key={m.epico}>
      <div className={styles.cabecalho}><h3><button type="button" className={styles.link} aria-label={`Filtrar pelo módulo ${m.epico}`} onClick={() => filtrar("modulo", m.epico)}>{m.epico}</button></h3><span className={styles.situacao}>{m.situacao}</span></div>
      <p className={styles.conclusao}><strong>{fmtNum(m.emProducao)} de {fmtNum(m.total)}</strong> entregas em produção.</p>
      <p className={styles.contexto}>Frentes: {fmtNum(m.xvia)} X-VIA · {fmtNum(m.sgd)} SGD. No cronograma: {m.cronograma ? `${fmtNum(m.cronograma.prontos)} de ${fmtNum(m.cronograma.total)} histórias concluídas.` : "sem histórias cadastradas."}</p>
      <ul className={styles.motivos}>{m.motivos.map((g) => <li key={g.tipo}>{g.rotulo}: <b>{fmtNum(g.itens.length)}</b></li>)}{m.inversoes > 0 && <li>Ligações invertidas: <b>{m.inversoes}</b></li>}</ul>
      <p className={styles.acao}><strong>Próxima ação:</strong> {m.acao}</p>
      {m.proximaSprint && <p className={styles.ajuda}>Próximo compromisso cadastrado: {m.proximaSprint.nome}, de {fmtData(m.proximaSprint.inicio)} a {fmtData(m.proximaSprint.fim)}, com {fmtNum(m.proximas)} entregas abertas.</p>}
      <div className={styles.links}><button type="button" onClick={() => onNavegar({ nivel: "gerente", aba: "prioridades", filtros: { modulo: m.epico } })}>Ver ações do módulo</button><button type="button" onClick={() => onNavegar({ nivel: "gerente", aba: "cronograma", filtros: { modulo: m.epico } })}>Ver cronograma do módulo</button></div>
    </li>)}</ul>
    {!linhas.length && <p className={styles.vazio}>Nenhum módulo corresponde aos filtros e à busca.</p>}
    <details className={styles.secundario}><summary>Consultar a distribuição e a tabela completa dos módulos</summary>
      <DashboardSection title="Como as entregas se distribuem?"><StackedBarChart itens={modulos.map((m) => ({ label: m.epico, atendidos: m.emProducao, pendentes: m.total - m.emProducao, descricao: `${fmtNum(m.emProducao)} de ${fmtNum(m.total)} em produção` }))} /></DashboardSection>
      <DashboardSection title="Registros agregados por módulo"><DataTable horizontalScroll columns={colunas} rows={modulos} rowKey={(m) => m.epico} onRowClick={(m) => filtrar("modulo", m.epico)} /></DashboardSection>
    </details>
  </div>;
}
