import type { prepararOrgaoGestao } from "@/lib/xvia-gestao";
import { fmtData, fmtNum, fmtReais } from "@/lib/tfs";
import { TabelaCadeia } from "./CadeiaFinanceira";
import styles from "./gestao.module.css";

export function DocumentosOrgao({ orgao }: { orgao: NonNullable<ReturnType<typeof prepararOrgaoGestao>> }) {
  return <details className={styles.secundario}><summary>Conferir documentos e etapas financeiras de {orgao.orgao}</summary>
    <p className={styles.ajuda}>Documentos vinculados ao órgão. O filtro usa as Ordens de Serviço cadastradas, não os quatro filtros das tarefas. Uma nota que reúna órgãos diferentes pode aparecer integralmente em mais de um órgão.</p>
    <TabelaCadeia cadeia={orgao.cadeia} />
    {!orgao.documentos.length && <p className={styles.ajuda}>Nenhuma Ordem de Serviço registrada para este órgão.</p>}
    <ul className={styles.comparacoes}>{orgao.documentos.map((os) => <li key={os.numero}>
      <h3>{os.numero} · {os.servico ?? "Serviço não informado"}</h3><p className={styles.ajuda}>{fmtNum(os.ustPrevista)} UST previstas · {os.status} · documento: {os.fonte}</p>
      {!os.medicoes.length && <p className={styles.ajuda}>Medição não informada.</p>}
      {os.medicoes.map((m) => <div key={m.id}>
        <p>Medição {m.id} ({m.periodo}): {fmtNum(m.ustExecutada)} UST executadas; {m.ustAceita == null ? "aceite não informado" : `${fmtNum(m.ustAceita)} aceitas em ${fmtData(m.dataAceite ?? null)}`}.</p><p className={styles.ajuda}>Documento: {m.fonte}</p>
        {!m.notas.length && <p className={styles.ajuda}>Nota fiscal não informada.</p>}
        {m.notas.map((n) => <div key={n.numero}><p>Nota {n.numero}: {fmtReais(n.valor)} · {n.status}.</p><p className={styles.ajuda}>Documento: {n.fonte}</p>
          {!n.pagamentos.length && <p className={styles.ajuda}>Pagamento não informado.</p>}
          {n.pagamentos.map((p, i) => <p key={`${p.notaFiscal}-${p.data}-${i}`}>Pagamento: {fmtReais(p.valor)} em {fmtData(p.data)} · {p.status} · documento: {p.fonte}.</p>)}
        </div>)}
      </div>)}
    </li>)}</ul>
  </details>;
}
