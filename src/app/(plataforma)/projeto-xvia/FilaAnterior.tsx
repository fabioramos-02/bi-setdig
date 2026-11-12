import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { fmtNum, linkTfs, quemResolve } from "@/lib/tfs";
import { LinkItem } from "./comum";

import type { LinhaPrioridade as Linha } from "@/lib/xvia-prioridades";
import type { AcoesGerente } from "@/lib/xvia-gestao-acoes";
import styles from "./gestao.module.css";

const colunas: Coluna<Linha>[] = [
  { key: "titulo", label: "Entrega", sortable: true, sortValue: (r) => r.titulo, render: (r) => <LinkItem item={r} /> },
  { key: "motivo", label: "Problema", sortable: true, sortValue: (r) => r.motivo, render: (r) => r.motivo },
  { key: "acao", label: "Ação necessária", render: (r) => <b>{r.acao}</b> },
  { key: "quem", label: "Responsável no TFS", sortable: true, sortValue: (r) => quemResolve(r), render: (r) => quemResolve(r) },
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico ?? "", render: (r) => r.epico ?? "—" },
  { key: "dias", label: "Dias sem atualização", align: "right", sortable: true, sortValue: (r) => r.diasSemAtualizar ?? 0, render: (r) => r.diasSemAtualizar === null ? "Não informado" : fmtNum(r.diasSemAtualizar) },
];

const csv = (ls: Linha[]) => ls.map((l) => ({ id: l.id, entrega: l.titulo, problema: l.motivo, acao: l.acao, responsavelNoRegistro: l.responsavel ?? "", modulo: l.epico ?? "", diasSemAtualizacao: l.diasSemAtualizar ?? "", link: linkTfs(l.id) }));

export function FilaAnterior({ acoes }: { acoes: AcoesGerente }) {
  return <details className={styles.secundario}>
    <summary>Fila por prazo e pendências: {fmtNum(acoes.filaAnterior["X-VIA"].length)} X-VIA e {fmtNum(acoes.filaAnterior.SGD.length)} SGD</summary>
    <p className={styles.ajuda}>Mantém os critérios e registros da fila anterior. A Central também inclui riscos e falta de sprint; os totais têm abrangências diferentes. Prazo/sprint vencida aqui não significa necessariamente atraso de desenvolvimento.</p>
    {(["X-VIA", "SGD"] as const).map((frente) => { const linhas = acoes.filaAnterior[frente]; return <DashboardSection key={frente} title={`${frente}: ${fmtNum(linhas.length)} registros`} action={linhas.length ? <ExportCsvButton filename={`projeto-xvia-prioridades-${frente === "X-VIA" ? "xvia" : "sgd"}.csv`} rows={csv(linhas)} /> : undefined}>
      {linhas.length ? <DataTable horizontalScroll pageSize={25} label={`Registros ${frente}`} rowId={(r) => `fila-anterior-${r.id}`} searchText={(r) => [r.id, r.titulo, r.motivo, r.acao, r.responsavel, r.epico].join(" ")} columns={colunas} rows={linhas} rowKey={(r) => String(r.id)} /> : <p className={styles.ajuda}>Não há registros desta frente que atendam aos critérios nos filtros aplicados.</p>}
    </DashboardSection>; })}
  </details>;
}
