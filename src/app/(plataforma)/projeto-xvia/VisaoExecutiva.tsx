import { fmtNum, fmtReais, type TfsContrato } from "@/lib/tfs";
import type { prepararResumoXvia } from "@/lib/xvia-resumo";
import { destinoDaAba, type NavegarProjeto } from "@/lib/xvia-navegacao";
import { PainelSecretario } from "./PainelSecretario";
import styles from "./projeto-xvia.module.css";

export function VisaoExecutiva({ resumo: r, contrato, onNavegar }: { resumo: ReturnType<typeof prepararResumoXvia>; contrato: TfsContrato | null; onNavegar: NavegarProjeto }) {
  return <div className={styles.executiva}>
    <PainelSecretario titulo="Visão do Secretário" cabecalho={r.cabecalho} frase={r.veredito.frase} tom={r.veredito.tom} sinais={r.veredito.sinais} onIrPara={(aba) => onNavegar(destinoDaAba(aba))} />
    <section aria-label="Decisões registradas">
      <div className={styles.tituloAtencao}><h2>Precisa da sua atenção</h2>{r.atencao.length > 0 && <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "gerente", aba: "prioridades", alvo: "decisoes-pendentes" })}>Ver {r.decisoes.length === 1 ? "a decisão" : `as ${fmtNum(r.decisoes.length)} decisões`}</button>}</div>
      {r.atencao.length ? <>
        <ol className={styles.atencao}>{r.atencao.map((i) => <li key={i.id}>
          <div><strong>{i.titulo}</strong><span className={styles.contextoItem}>{i.contexto}</span></div>
          <button type="button" aria-label={`Ver ${i.titulo} em Prioridades`} onClick={() => onNavegar({ nivel: "gerente", aba: "prioridades", alvo: `prioridade-${i.id}` })}>Detalhes</button>
        </li>)}</ol>
        <p className={styles.contexto}>Decisão específica e impacto ainda não estão descritos nos registros publicados.</p>
      </> : <p className={styles.contexto}>{r.temEntregas ? "Nenhuma entrega da X-VIA está registrada como aguardando decisão neste filtro." : "Este filtro não tem entregas da X-VIA para consultar decisões."}</p>}
    </section>
    <section aria-label="Próximos passos"><h2>Próximos passos</h2>
      <ol className={styles.passos}>{r.passos.map((p) => <li key={p.texto}>
        <button type="button" onClick={() => onNavegar(p.destino)}>{p.texto}</button>
        <span className={styles.contextoItem}>{p.quem ? `No registro: ${p.quem}` : "Responsável ainda não definido nos registros"}</span>
      </li>)}</ol>
      <h3 className={styles.subtitulo}>Registros do contrato</h3>
      <div className={styles.avisos}>
        <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "gerente", aba: "financeiro" })}>Pagamento: {r.cadeia.valorPago.valor === null ? "não informado" : fmtReais(r.cadeia.valorPago.valor)}</button>
        <button type="button" className={styles.link} onClick={() => onNavegar({ nivel: "gerente", aba: "fiscalizacao", alvo: "prazos-atendimento" })}>Prazos de atendimento: {contrato?.ans?.medicao ? `medição de ${contrato.ans.medicao.mes}` : "ainda sem medição"}</button>
      </div>
    </section>
  </div>;
}
