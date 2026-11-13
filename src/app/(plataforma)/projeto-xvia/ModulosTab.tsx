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
type Severidade = "critico" | "atencao" | "operacional" | "sucesso" | "neutro";

const SEVERIDADE_TIPO: Record<string, Severidade> = {
  decisao: "critico", impedimento: "critico", atraso: "critico",
  orgao: "atencao", risco: "atencao",
  replanejar: "operacional", planejar: "operacional",
};

const SEVERIDADE_SITUACAO: Record<string, Severidade> = {
  "Atrasado": "critico",
  "Esperando órgão/decisão": "critico",
  "Em risco": "atencao",
  "Não iniciado": "atencao",
  "Em andamento": "operacional",
  "A planejar": "operacional",
  "Futuro": "operacional",
  "Pronto": "sucesso",
};

function severidadeDoModulo(m: ModuloGestao): Severidade {
  const primeiro = m.motivos[0]?.tipo;
  if (primeiro && SEVERIDADE_TIPO[primeiro]) return SEVERIDADE_TIPO[primeiro];
  return SEVERIDADE_SITUACAO[m.situacao] ?? "neutro";
}

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
    <header className={styles.topoAba}>
      <div className={styles.topoTexto}>
        <h2>Quais módulos pedem intervenção?</h2>
        <p className={styles.contexto}>{contexto}</p>
      </div>
      <label className={`${styles.busca} print:hidden`}>
        <span className={styles.buscaRotulo}>Localizar módulo</span>
        <input type="search" className="ds-input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" />
      </label>
    </header>
    <ul className={styles.gradeModulos}>{linhas.map((m) => {
      const sev = severidadeDoModulo(m);
      const pct = m.total ? Math.round((m.emProducao / m.total) * 100) : 0;
      return <li key={m.epico} className={styles.moduloCard} data-severidade={sev}>
        <div className={styles.cabecalhoCard}>
          <span className={styles.statusPill} data-severidade={sev}>{m.situacao}</span>
          <h3 className={styles.nomeModulo}>
            <button type="button" aria-label={`Filtrar pelo módulo ${m.epico}`} onClick={() => filtrar("modulo", m.epico)}>{m.epico}</button>
          </h3>
        </div>
        <div className={styles.progresso}>
          {m.total > 0 ? <>
            <p className={styles.progressoRotulo}>{fmtNum(m.emProducao)} de {fmtNum(m.total)} em produção · {pct}%</p>
            <div className={styles.barraProgresso} role="img" aria-label={`${pct}% das entregas em produção`}>
              <span className={styles.segProducao} style={{ width: `${pct}%` }} />
            </div>
          </> : <p className={styles.progressoRotulo}>Sem entregas registradas.</p>}
          <p className={styles.microCaption}>
            {fmtNum(m.xvia)} X-VIA · {fmtNum(m.sgd)} SGD · cronograma: {m.cronograma ? `${fmtNum(m.cronograma.prontos)} de ${fmtNum(m.cronograma.total)} histórias concluídas` : "sem histórias cadastradas"}
          </p>
        </div>
        {(m.motivos.length > 0 || m.inversoes > 0) && <ul className={styles.listaChips}>
          {m.motivos.map((g) => <li key={g.tipo}>
            <span className={styles.chipMotivo} data-severidade={SEVERIDADE_TIPO[g.tipo] ?? "operacional"}>
              {g.rotulo} · {fmtNum(g.itens.length)}
            </span>
          </li>)}
          {m.inversoes > 0 && <li>
            <span className={styles.chipMotivo} data-severidade="operacional">Ligações invertidas · {fmtNum(m.inversoes)}</span>
          </li>}
        </ul>}
        <div className={styles.blocoProxAcao} data-severidade={sev}>
          <p className={styles.rotuloProxAcao}>Próxima ação</p>
          <p className={styles.textoProxAcao}>{m.acao}</p>
          {m.proximaSprint && <p className={styles.linhaProxSprint}>
            Próximo compromisso: {m.proximaSprint.nome} ({fmtData(m.proximaSprint.inicio)} – {fmtData(m.proximaSprint.fim)}), {fmtNum(m.proximas)} entregas abertas.
          </p>}
        </div>
        <div className={styles.linksSecundarios}>
          <button type="button" onClick={() => onNavegar({ nivel: "gerente", aba: "prioridades", filtros: { modulo: m.epico } })}>Ver ações do módulo</button>
          <button type="button" onClick={() => onNavegar({ nivel: "gerente", aba: "cronograma", filtros: { modulo: m.epico } })}>Ver cronograma do módulo</button>
        </div>
      </li>;
    })}</ul>
    {!linhas.length && <p className={styles.vazio}>Nenhum módulo corresponde aos filtros e à busca.</p>}
    <details className={styles.secundario}>
      <summary>Como ler estes cards, distribuição completa e tabela</summary>
      <p className={styles.ajuda}>Produção inclui histórias e falhas; o cronograma acompanha apenas histórias. A situação do cronograma é a mais grave entre as histórias abertas. X-VIA e SGD estão identificadas nos números dos cards.</p>
      <DashboardSection title="Como as entregas se distribuem?"><StackedBarChart itens={modulos.map((m) => ({ label: m.epico, atendidos: m.emProducao, pendentes: m.total - m.emProducao, descricao: `${fmtNum(m.emProducao)} de ${fmtNum(m.total)} em produção` }))} /></DashboardSection>
      <DashboardSection title="Registros agregados por módulo"><DataTable horizontalScroll columns={colunas} rows={modulos} rowKey={(m) => m.epico} onRowClick={(m) => filtrar("modulo", m.epico)} /></DashboardSection>
    </details>
  </div>;
}
