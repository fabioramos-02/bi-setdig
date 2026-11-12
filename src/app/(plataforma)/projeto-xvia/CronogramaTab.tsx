"use client";

import { useEffect, useRef, useState } from "react";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { montarCronograma, montarPorFeature, type Situacao } from "@/lib/cronograma";
import { fmtData, fmtNum, type Origem, type TfsItem, type TfsSprint } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { BaixarImagem, nomeArquivo } from "./BaixarImagem";
import { GanttFeatures } from "./GanttFeatures";
import { GanttPbis } from "./GanttPbis";
import { COR_INVERTIDA, COR_SIT, Legenda } from "./GanttComum";
import { LinkItem, cinza } from "./comum";

const LEGENDA: Situacao[] = ["concluido", "andamento", "futuro", "atrasado", "esperando", "nao_iniciado", "risco", "sem_sprint"];

/** Nível 2 — Cronograma executivo (PBI #1348598), pedido do Fabio em 11/11/2026: o gerente
 * acompanha o épico pelas Features. Topo = o que fazer; gráfico = uma linha por Feature;
 * clicar abre os PBIs dela. Na visão geral, uma linha por módulo; clicar abre o módulo. */
export function CronogramaTab({ itens, sprints, hoje, modulo, onModuloChange }: { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string; modulo: string; onModuloChange: (modulo: string) => void }) {
  const epicos = [...new Map(itens.filter((i) => i.epicoId && i.epico).map((i) => [i.epicoId!, i.epico!])).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const doFiltro = epicos.find(([, nome]) => nome === modulo)?.[0];
  const [feature, setFeature] = useState<number | null>(null);
  const epicoId = doFiltro ?? null;
  const nomeModulo = epicos.find(([id]) => id === epicoId)?.[1] ?? "";
  const m = montarPorFeature(itens, sprints, epicoId, hoje);
  const svgMacro = useRef<SVGSVGElement>(null);
  const svgPbis = useRef<SVGSVGElement>(null);
  const detalheRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feature === null) return;
    const id = requestAnimationFrame(() => { detalheRef.current?.focus({ preventScroll: true }); detalheRef.current?.scrollIntoView({ block: "start" }); });
    return () => cancelAnimationFrame(id);
  }, [feature]);
  const fecharDetalhe = () => { svgMacro.current?.querySelector<SVGElement>("[aria-pressed=true]")?.focus(); setFeature(null); };
  const linhaSel = m.linhas.find((l) => l.id === feature) ?? null;
  const detalhe = epicoId !== null && linhaSel ? montarCronograma(itens, sprints, epicoId, hoje, linhaSel.id) : null;
  const titulo = epicoId === null ? "Cronograma por módulo" : `Cronograma: ${nomeModulo}`;
  const trocarModulo = (v: string) => { onModuloChange(epicos.find(([id]) => String(id) === v)?.[1] ?? ""); setFeature(null); };
  const selecionar = (id: number | null) => (epicoId === null ? id !== null && trocarModulo(String(id)) : setFeature(id));

  const chip = (rotulo: string, itensChip: TfsItem[], acao: string, cor: string, origem: Origem) => (
    <div className="flex flex-col gap-1" style={{ border: "1px solid var(--ds-color-border)", borderTop: `4px solid ${cor}`, borderRadius: "var(--ds-radius-md)", padding: "10px 12px", background: "var(--ds-color-background)" }}>
      <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--ds-color-text-primary)" }}>{fmtNum(itensChip.length)}</span>
      <span className="text-sm" style={{ color: "var(--ds-color-text-primary)" }}>{rotulo}</span>
      <span className="text-xs" style={cinza}>{acao}</span>
      {itensChip.length > 0 && <span className="mt-auto pt-1"><OrigemBotao origem={origem} /></span>}
    </div>
  );
  const origemDe = (rotulo: string, lista: TfsItem[], detalheTexto: string): Origem => ({
    rotulo, numero: `${fmtNum(lista.length)} ${rotulo.toLowerCase()}`, detalhe: detalheTexto, itens: lista, agruparPor: "coluna",
    fonte: "TFS: coluna do quadro e sprint de cada PBI da X-VIA",
  });
  const inv = m.aFazer.invertidas;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm"><button type="button" onClick={() => onModuloChange("")} className="underline">Todos os módulos</button>{nomeModulo && <> / <strong>{nomeModulo}</strong></>}</p>

      <StoryCard
        anchor={`${epicoId === null ? "Projeto" : nomeModulo}: ${m.frase}`}
        comoLer="Cada linha é uma Feature (ou um módulo, na visão geral). A barra vai da primeira à última sprint das entregas dela; a parte escura é o que já está pronto. A cor diz a pior situação entre as entregas abertas. Clique numa linha para ver as entregas. Não iniciado = a sprint acabou e a entrega nem começou (replanejar); esperando = parada no órgão, numa decisão ou num impedimento; atrasado = em desenvolvimento com a sprint vencida."
      />

      <section aria-label="O que fazer" className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {chip("para replanejar", m.aFazer.replanejar, "Sprint vencida e não começaram", COR_SIT.nao_iniciado, origemDe("PBIs para replanejar", m.aFazer.replanejar, "PBIs da X-VIA em A fazer ou Área de Negócios cuja sprint já terminou."))}
        {chip("esperando órgão ou decisão", m.aFazer.cobrar, "Cobrar quem precisa agir", COR_SIT.esperando, origemDe("PBIs esperando", m.aFazer.cobrar, "PBIs da X-VIA nas colunas Aguardando Validação do Órgão, Aguardando decisão ou Impedido."))}
        {chip("atrasos reais", m.aFazer.atrasos, "Em desenvolvimento com sprint vencida", COR_SIT.atrasado, origemDe("Atrasos reais", m.aFazer.atrasos, "PBIs da X-VIA em desenvolvimento ou homologação cuja sprint já terminou."))}
        {chip("dependências ao contrário", inv.map((p) => p.depois), "Corrigir a sprint no TFS", COR_INVERTIDA, {
          rotulo: "Dependências planejadas ao contrário", numero: `${fmtNum(inv.length)} dependências ao contrário`,
          passos: inv.map((p) => `#${p.antes.id} precisa vir antes de #${p.depois.id}, mas está numa sprint depois`),
          detalhe: "A entrega predecessora foi planejada para depois da que depende dela.", itens: inv.flatMap((p) => [p.antes, p.depois]), agruparPor: "epico",
        })}
      </section>

      <DashboardSection title={titulo} action={<BaixarImagem alvo={svgMacro} nome={nomeArquivo(titulo, hoje)} titulo={`${titulo} · TFS de ${fmtData(hoje)}`} />}>
        <GanttFeatures m={m} hoje={hoje} selecionada={feature} onSelecionar={selecionar} svgRef={svgMacro} />
        <Legenda situacoes={LEGENDA} />
        <p className="mt-2 text-xs" style={cinza}>
          {epicoId === null ? "Clique num módulo para ver as Features dele." : "Clique numa Feature para ver as entregas dela."} As Features ainda não têm data de início e fim no TFS: a barra usa as sprints das entregas.
        </p>
      </DashboardSection>

      {detalhe && linhaSel && (
        <div ref={detalheRef} tabIndex={-1} aria-label={`Entregas de ${linhaSel.titulo}`}>
        <DashboardSection
          title={`Entregas de ${linhaSel.titulo} (${linhaSel.prontos}/${linhaSel.total} prontas)`}
          action={
            <span className="flex gap-4 items-center">
              {detalhe.blocos.some((b) => b.cadeia !== null) && <BaixarImagem alvo={svgPbis} nome={nomeArquivo(`cronograma-${linhaSel.titulo}`, hoje)} titulo={`${linhaSel.titulo} · TFS de ${fmtData(hoje)}`} />}
              <button type="button" onClick={fecharDetalhe} className="text-sm underline print:hidden" style={{ color: "var(--ds-color-primary-600)" }}>Fechar</button>
            </span>
          }
        >
          <GanttPbis c={detalhe} hoje={hoje} svgRef={svgPbis} />
        </DashboardSection>
        </div>
      )}

      {(m.alertas.fechadaComAberto.length > 0 || m.alertas.vazias.length > 0 || m.alertas.semDatas.length > 0) && (
        <details style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", padding: "12px 16px", background: "var(--ds-color-background)" }}>
          <summary className="cursor-pointer text-sm font-semibold">Conferir o planejamento</summary>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {m.alertas.fechadaComAberto.map((l) => <li key={`d${l.id}`}><LinkItem item={{ id: l.id!, titulo: l.titulo }} /> está concluída, mas tem {l.total - l.prontos} entrega(s) aberta(s).</li>)}
            {m.alertas.vazias.map((l) => <li key={`v${l.id}`}><LinkItem item={{ id: l.id!, titulo: l.titulo }} /> ainda não tem entregas cadastradas; pode representar trabalho futuro.</li>)}
            {m.alertas.semDatas.length > 0 && <li>{fmtNum(m.alertas.semDatas.length)} Features sem data de início e fim (task #1375476).</li>}
          </ul>
        </details>
      )}
    </div>
  );
}
