"use client";

import { useEffect, useRef, useState } from "react";
import { prepararCronogramaGestao } from "@/lib/xvia-gestao";
import type { NavegarProjeto } from "@/lib/xvia-navegacao";
import { AcoesCronograma } from "./AcoesCronograma";
import { DependenciasGerente } from "./DependenciasGerente";
import styles from "./gestao.module.css";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { type Situacao } from "@/lib/cronograma";
import { fmtData, fmtNum, type TfsItem, type TfsSprint } from "@/lib/tfs";
import { BaixarImagem, nomeArquivo } from "./BaixarImagem";
import { GanttFeatures } from "./GanttFeatures";
import { GanttPbis } from "./GanttPbis";
import { Legenda } from "./GanttComum";
import { LinkItem, cinza } from "./comum";

const LEGENDA: Situacao[] = ["concluido", "andamento", "futuro", "atrasado", "esperando", "nao_iniciado", "risco", "sem_sprint"];

/** Nível 2 — Cronograma executivo (PBI #1348598), pedido do Fabio em 11/11/2026: o gerente
 * acompanha o épico pelas Features. Topo = o que fazer; gráfico = uma linha por Feature;
 * clicar abre os PBIs dela. Na visão geral, uma linha por módulo; clicar abre o módulo. */
export function CronogramaTab({ itens, sprints, hoje, modulo, onModuloChange, contexto, onNavegar }: { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string; modulo: string; onModuloChange: (modulo: string) => void; contexto: string; onNavegar: NavegarProjeto }) {
  const [feature, setFeature] = useState<number | null>(null);
  const { epicos, epicoId, nomeModulo, m, linhaSel, detalhe, titulo, frase } = prepararCronogramaGestao(itens, sprints, hoje, modulo, feature);
  const ligacoesRef = useRef<HTMLDetailsElement>(null);
  const svgMacro = useRef<SVGSVGElement>(null);
  const svgPbis = useRef<SVGSVGElement>(null);
  const detalheRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feature === null) return;
    const id = requestAnimationFrame(() => { detalheRef.current?.focus({ preventScroll: true }); detalheRef.current?.scrollIntoView({ block: "start" }); });
    return () => cancelAnimationFrame(id);
  }, [feature]);
  const fecharDetalhe = () => { svgMacro.current?.querySelector<SVGElement>("[aria-pressed=true]")?.focus(); setFeature(null); };
  const trocarModulo = (v: string) => { onModuloChange(epicos.find(([id]) => String(id) === v)?.[1] ?? ""); setFeature(null); };
  const selecionar = (id: number | null) => (epicoId === null ? id !== null && trocarModulo(String(id)) : setFeature(id));

  return (
    <div className={styles.pagina}>
      <p className="bi-body"><button type="button" onClick={() => onModuloChange("")} className="underline">Todos os módulos</button>{nomeModulo && <> / <strong>{nomeModulo}</strong></>}</p>

      <header><h2>Onde o planejamento precisa de ajuste?</h2><p className={styles.contexto}>{contexto}</p><p className={styles.conclusao}>{frase}</p><p className={styles.ajuda}>O cronograma acompanha histórias, sem as falhas de desenvolvimento. A situação é a pior entre as histórias abertas de cada linha, não uma pontuação de saúde.</p></header>
      <AcoesCronograma macro={m} onNavegar={onNavegar} conferirLigacoes={() => { if (ligacoesRef.current) { ligacoesRef.current.open = true; ligacoesRef.current.focus(); ligacoesRef.current.scrollIntoView({ block: "start" }); } }} />
      <DependenciasGerente pares={m.aFazer.invertidas} alvo={ligacoesRef} />

      <DashboardSection title={titulo} action={<BaixarImagem alvo={svgMacro} nome={nomeArquivo(titulo, hoje)} titulo={`${titulo} · TFS de ${fmtData(hoje)}`} />}>
        <p className={styles.ajuda}>Os totais do gráfico incluem as frentes presentes nos filtros. O rótulo de uma linha identifica a frente do módulo ou da Feature; as histórias vinculadas podem ser da X-VIA ou da SGD.</p>
        <GanttFeatures m={m} hoje={hoje} selecionada={feature} onSelecionar={selecionar} svgRef={svgMacro} />
        <Legenda situacoes={LEGENDA} />
        <p className="mt-2 bi-caption" style={cinza}>
          {epicoId === null ? "Clique num módulo para ver as Features dele." : "Clique numa Feature para ver as entregas dela."} A barra usa as sprints e a data de início das histórias; esse intervalo não representa um marco formal de aceite.
        </p>
      </DashboardSection>

      {detalhe && linhaSel && (
        <div ref={detalheRef} tabIndex={-1} aria-label={`Entregas de ${linhaSel.titulo}`}>
        <DashboardSection
          title={`Entregas de ${linhaSel.titulo} (${linhaSel.prontos}/${linhaSel.total} prontas)`}
          action={
            <span className="flex gap-4 items-center">
              {detalhe.blocos.some((b) => b.cadeia !== null) && <BaixarImagem alvo={svgPbis} nome={nomeArquivo(`cronograma-${linhaSel.titulo}`, hoje)} titulo={`${linhaSel.titulo} · TFS de ${fmtData(hoje)}`} />}
              <button type="button" onClick={fecharDetalhe} className="bi-body underline print:hidden" style={{ color: "var(--ds-color-primary-600)" }}>Fechar</button>
            </span>
          }
        >
          <GanttPbis c={detalhe} hoje={hoje} svgRef={svgPbis} />
        </DashboardSection>
        </div>
      )}

      <details className={styles.secundario}><summary>Como ler o cronograma?</summary><p className={styles.ajuda}>A barra vai da primeira à última sprint da história, incluindo a data de início quando disponível; a parte escura mostra o que foi concluído. Não iniciado: sprint vencida e trabalho ainda na fila. Esperando: validação do órgão, decisão ou impedimento. Atrasado: situação calculada pelo cronograma após a sprint prevista. Em risco: depende de outra entrega em condição desfavorável. Clique em um módulo e depois em uma Feature para ver as histórias.</p></details>

      {(m.alertas.fechadaComAberto.length > 0 || m.alertas.vazias.length > 0 || m.alertas.semDatas.length > 0) && (
        <details style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", padding: "12px 16px", background: "var(--ds-color-background)" }}>
          <summary className="cursor-pointer bi-body font-semibold">Conferir o planejamento</summary>
          <ul className="mt-2 flex flex-col gap-1.5 bi-body">
            {m.alertas.fechadaComAberto.map((l) => <li key={`d${l.id}`}><LinkItem item={{ id: l.id!, titulo: l.titulo }} /> está concluída, mas tem {l.total - l.prontos} entrega(s) aberta(s).</li>)}
            {m.alertas.vazias.map((l) => <li key={`v${l.id}`}><LinkItem item={{ id: l.id!, titulo: l.titulo }} /> ainda não tem entregas cadastradas; pode representar trabalho futuro.</li>)}
            {m.alertas.semDatas.length > 0 && <li>{fmtNum(m.alertas.semDatas.length)} Features sem data de início e fim (task #1375476).</li>}
          </ul>
        </details>
      )}
    </div>
  );
}
