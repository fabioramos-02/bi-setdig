import type { GestaoProjeto } from "@/lib/xvia-gestao";
import type { AcaoGestao } from "@/lib/xvia-gestao-acoes";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import { FilaGestao } from "./FilaGestao";
import { FilaAnterior } from "./FilaAnterior";
import { AcompanhamentoGerente } from "./AcompanhamentoGerente";
import styles from "./gestao.module.css";

export function PrioridadesTab({ gestao, frente, grupo, alvoId, contexto, onNavegar }: { gestao: GestaoProjeto; frente: string; grupo: AcaoGestao | ""; alvoId: number | null; contexto: string; onNavegar: NavegarProjeto }) {
  return <div className={styles.pagina} id="decisoes-pendentes" tabIndex={-1}>
    <header><h2>Precisa de ação</h2><p className={styles.contexto}>{contexto}</p><p className={styles.conclusao}>Decisões e impedimentos primeiro; depois, desvios de planejamento.</p></header>
    <FilaGestao acoes={gestao.acoes} frenteFiltro={frente} grupo={grupo} alvoId={alvoId} onNavegar={onNavegar} />
    <AcompanhamentoGerente gestao={gestao} onNavegar={onNavegar} />
    <FilaAnterior acoes={gestao.acoes} />
  </div>;
}
