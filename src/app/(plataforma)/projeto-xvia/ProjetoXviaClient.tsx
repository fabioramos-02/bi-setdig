"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportarProjeto, type ModoExportacao } from "./ExportarProjeto";
import { VisaoExecutiva } from "./VisaoExecutiva";
import { prepararResumoXvia } from "@/lib/xvia-resumo";
import { destinoDaAba, enderecoDoDestino, enderecoSemFiltros, lerNavegacao, type DestinoProjeto, type NivelProjeto } from "@/lib/xvia-navegacao";
import styles from "./projeto-xvia.module.css";
import { prepararGestao } from "@/lib/xvia-gestao";
import { ACAO_GESTAO, consultarEntregas, ehAcaoGestao } from "@/lib/xvia-gestao-acoes";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { bugsDoQa, soXvia, filtrarItens, temRecorte, type EtpUst, type Filtros, type Financeiro, type TfsContrato, type TfsItem, type TfsSprint, type TfsStakeholder } from "@/lib/tfs";
import { FiltrosBar, descreverFiltros } from "./FiltrosBar";
import { RelatorioMensal } from "./RelatorioMensal";
import { QualidadeTab } from "./QualidadeTab";
import { FinanceiroTab } from "./FinanceiroTab";
import { ModulosTab } from "./ModulosTab";
import { PrioridadesTab } from "./PrioridadesTab";
import { CronogramaTab } from "./CronogramaTab";
import { EntregasTab } from "./EntregasTab";
import { EquipesTab } from "./EquipesTab";
import { RegistrosFinanceirosTab } from "./RegistrosFinanceirosTab";
import { FiscalizacaoTab } from "./FiscalizacaoTab";
import { UstTab } from "./UstTab";
import { StakeholdersTab } from "./StakeholdersTab";
import { AcompanhamentoTab } from "./AcompanhamentoTab";
import type { WidgetPainel } from "@/lib/tfs-painel";

export type Filtrar = (campo: keyof Filtros, valor: string) => void;

/** Acompanhamento do contrato X-VIA a partir do backlog do TFS — pedido do
 * Secretário Executivo. Sem filtro de período: retrato do backlog no dia da
 * extração. Os filtros (módulo, frente, órgão, sprint) ficam na URL e valem
 * para todas as abas; clicar numa barra ou linha aplica o filtro. */
export function ProjetoXviaClient({
  itens,
  sprints,
  contrato,
  etp,
  stakeholders,
  financeiro,
  hoje,
  diasRetrato,
  painel,
}: {
  itens: TfsItem[];
  sprints: TfsSprint[];
  contrato: TfsContrato | null;
  etp: EtpUst | null;
  stakeholders: TfsStakeholder[];
  financeiro: Financeiro | null;
  hoje: string;
  diasRetrato: number | null;
  painel: { widgets: WidgetPainel[]; atualizadoEm: string | null; diasSemAtualizar: number | null };
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { aba: abaAtiva, nivel } = lerNavegacao(params);
  const [modoExport, setModoExport] = useState<ModoExportacao>(null);
  const [pedidoFoco, setPedidoFoco] = useState<(DestinoProjeto & { endereco: string }) | null>(null);
  const focoTratado = useRef<DestinoProjeto | null>(null);
  useEffect(() => {
    if (!pedidoFoco || focoTratado.current === pedidoFoco || nivel !== pedidoFoco.nivel || abaAtiva !== pedidoFoco.aba) return;
    if (`${pathname}?${params}` !== pedidoFoco.endereco) return;
    const id = requestAnimationFrame(() => {
      const alvo = document.getElementById(pedidoFoco.alvo ?? `panel-${pedidoFoco.aba}`);
      if (alvo) {
        for (let pai = alvo.parentElement; pai; pai = pai.parentElement) if (pai instanceof HTMLDetailsElement) pai.open = true;
        alvo.tabIndex = -1; alvo.focus({ preventScroll: true }); alvo.scrollIntoView({ block: "start" }); focoTratado.current = pedidoFoco;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [pedidoFoco, nivel, abaAtiva, params, pathname]);

  const filtros: Filtros = useMemo(() => ({
    modulo: params.get("modulo") ?? "",
    frente: params.get("frente") ?? "",
    orgao: params.get("orgao") ?? "",
    sprint: params.get("sprint") ?? "",
  }), [params]);
  const filtrar: Filtrar = (campo, valor) => {
    const novo = new URLSearchParams(params.toString());
    if (valor && valor !== filtros[campo]) novo.set(campo, valor);
    else novo.delete(campo); // clicar de novo no mesmo item limpa o filtro
    router.replace(`${pathname}${novo.size ? `?${novo}` : ""}`, { scroll: false });
  };
  const limpar = () => router.replace(enderecoSemFiltros(pathname, params), { scroll: false });

  const recorte = useMemo(() => filtrarItens(itens, filtros), [itens, filtros]);
  const dataRetrato = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR");
  const filtroRelatorio = `${descreverFiltros(filtros) || "Projeto inteiro"} · retrato do TFS em ${dataRetrato}`;

  // Três níveis de leitura (pedido do Fabio, 11/2026): Secretário → Gerente → Detalhamento.
  // Só a X-VIA entra em execução, entregas e financeiro; a SGD aparece separada (ADR-017).
  const entrada = { itens: recorte, sprints, contrato, etp, financeiro, hoje, recorte: temRecorte(filtros) };
  const resumo = prepararResumoXvia(entrada);
  const navegar = (d: DestinoProjeto, receberFoco = true) => {
    const endereco = enderecoDoDestino(pathname, params, d);
    setPedidoFoco(receberFoco ? { ...d, endereco } : null);
    if (receberFoco) router.push(endereco, { scroll: false }); else router.replace(endereco, { scroll: false });
  };
  const irPara = (aba: string) => navegar(destinoDaAba(aba));
  const gestao = useMemo(() => prepararGestao({ itens: recorte, sprints, contrato, etp, financeiro, hoje }), [recorte, sprints, contrato, etp, financeiro, hoje]);
  const grupoFila = params.get("grupo");
  const acaoConsulta = params.get("acao");
  const alvoId = pedidoFoco?.alvo?.startsWith("prioridade-") ? Number(pedidoFoco.alvo.replace("prioridade-", "")) : null;
  const contextoGerente = `${descreverFiltros(filtros) || "Projeto inteiro"} · dados de ${dataRetrato}`;
  const niveis: { id: string; label: string; descricao: string; abas: TabItem[] }[] = [
    {
      id: "secretario", label: "1. Visão do Secretário", descricao: "Conclusão, decisões e próximos passos.",
      abas: [
        { id: "relatorio", label: "Relatório do mês", content: <VisaoExecutiva resumo={resumo} contrato={contrato} onNavegar={navegar} /> },
      ],
    },
    {
      id: "gerente", label: "2. Visão do Gerente", descricao: "O que está parado, quem resolve, cronograma, módulos, gasto por órgão e aceite.",
      abas: [
        { id: "prioridades", label: "Central de ação", content: <PrioridadesTab key={`${params}-${pedidoFoco?.alvo ?? ""}`} gestao={gestao} frente={filtros.frente} grupo={ehAcaoGestao(grupoFila) ? grupoFila : ""} alvoId={alvoId} contexto={contextoGerente} onNavegar={navegar} /> },
        { id: "cronograma", label: "Cronograma", content: <CronogramaTab itens={recorte} sprints={sprints} hoje={hoje} modulo={filtros.modulo} onModuloChange={(v) => filtrar("modulo", v)} contexto={contextoGerente} onNavegar={navegar} /> },
        { id: "modulos", label: "Módulos", content: <ModulosTab modulos={gestao.modulos} contexto={contextoGerente} filtrar={filtrar} onNavegar={navegar} /> },
        { id: "fiscalizacao", label: "Sprint e acompanhamento", content: <FiscalizacaoTab dados={gestao.sprint} ans={contrato?.ans ?? null} bugs={bugsDoQa(soXvia(recorte))} contexto={contextoGerente} onNavegar={navegar} /> },
        { id: "financeiro", label: "Execução e financeiro", content: <FinanceiroTab dados={gestao.execucao} financeiro={financeiro} contexto={contextoGerente} origemExecucao={resumo.veredito.sinais.find((s) => s.id === "execucao")?.origem} onNavegar={navegar} /> },
      ],
    },
    {
      id: "detalhe", label: "3. Detalhamento", descricao: "De onde vem cada número: UST, registros financeiros, entregas, órgãos, equipes e qualidade do dado.",
      abas: [
        { id: "ust", label: "A. UST e contrato", content: <UstTab itens={recorte} etp={etp} contrato={contrato} mensal={resumo.mensal} hoje={hoje} prazo={resumo.prazo} /> },
        { id: "registros", label: "B. Registros financeiros", content: <RegistrosFinanceirosTab financeiro={financeiro} /> },
        { id: "entregas", label: "C. Entregas", content: <div>{ehAcaoGestao(acaoConsulta) && <p className="text-sm mb-4">Critério desta lista: <b>{ACAO_GESTAO[acaoConsulta].rotulo}</b>. <button type="button" className={styles.link} onClick={() => navegar({ nivel: "detalhe", aba: "entregas" })}>Consultar todas as entregas nos filtros aplicados</button></p>}<EntregasTab itens={consultarEntregas(gestao.acoes, recorte, acaoConsulta)} /></div> },
        { id: "orgaos", label: "D. Órgãos e serviços", content: <StakeholdersTab itens={recorte} stakeholders={stakeholders} filtros={filtros} filtrar={filtrar} /> },
        { id: "equipes", label: "E. Equipes", content: <EquipesTab itens={recorte} sprints={sprints} hoje={hoje}><AcompanhamentoTab {...painel} /></EquipesTab> },
        { id: "qualidade", label: "F. Qualidade dos dados", content: <QualidadeTab itens={recorte} etp={etp} contrato={contrato} financeiro={financeiro} hoje={hoje} diasRetrato={diasRetrato} /> },
      ],
    },
  ];
  const nivelAtual = niveis.find((n) => n.id === nivel) ?? niveis[0];
  const abas = nivelAtual.abas;
  const trocarNivel = (id: string) => navegar({ nivel: id as NivelProjeto, aba: id === "gerente" ? "prioridades" : id === "detalhe" ? "ust" : "relatorio" }, false);

  return (
    <div className={`${styles.root} flex flex-col flex-1 min-w-0`} data-export={modoExport ?? undefined}>
      <ContentTopBar title="Projeto X-VIA">
        <ExportarProjeto secoes={abas.map((a) => ({ id: a.id, label: a.label }))} ativaId={abaAtiva} filtro={filtroRelatorio} onModo={setModoExport} />
      </ContentTopBar>
      <main className="flex-1 p-4 md:p-6 min-w-0">
        <RelatorioCapa titulo="Projeto X-VIA" filtro={filtroRelatorio} />
        <div className={styles.conteudo}>
          <nav aria-label="Nível de leitura" className={`${styles.niveis} print:hidden`}>
            {niveis.map((n, index) => <button key={n.id} type="button" onClick={() => trocarNivel(n.id)} aria-label={n.label} aria-pressed={n.id === nivelAtual.id}>
              {["1. Secretário", "2. Gerente", "3. Detalhamento"][index]}
            </button>)}
          </nav>
          <FiltrosBar itens={itens} filtros={filtros} filtrar={filtrar} limpar={limpar} total={recorte.length} dataRetrato={dataRetrato} />
          {abas.length === 1 ? <div id={`panel-${abas[0].id}`}>{abas[0].content}</div> :
            <Tabs items={abas} ativa={abas.some((a) => a.id === abaAtiva) ? abaAtiva : abas[0].id} onAtivaChange={(id) => navegar(destinoDaAba(id), false)} />}
        </div>
        <div className={styles.printOnly}><RelatorioMensal {...entrada} onIrPara={irPara} /></div>
        <div className={styles.resumoPrint}><VisaoExecutiva resumo={resumo} contrato={contrato} onNavegar={navegar} /></div>
      </main>
    </div>
  );
}
