"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportarRelatorioButton } from "@/components/dashboard/ExportarRelatorioButton";
import { RelatorioCapa } from "@/components/dashboard/RelatorioCapa";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { filtrarItens, type EtpUst, type Filtros, type TfsContrato, type TfsItem, type TfsSprint, type TfsStakeholder } from "@/lib/tfs";
import { FiltrosBar, descreverFiltros } from "./FiltrosBar";
import { ExecutivoTab } from "./ExecutivoTab";
import { QualidadeTab } from "./QualidadeTab";
import { ModulosTab } from "./ModulosTab";
import { PendenciasTab } from "./PendenciasTab";
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
  hoje,
  painel,
}: {
  itens: TfsItem[];
  sprints: TfsSprint[];
  contrato: TfsContrato | null;
  etp: EtpUst | null;
  stakeholders: TfsStakeholder[];
  hoje: string;
  painel: { widgets: WidgetPainel[]; atualizadoEm: string | null; diasSemAtualizar: number | null };
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [abaAtiva, setAbaAtiva] = useState("executivo");
  const [nivel, setNivel] = useState("secretario");

  const filtros: Filtros = {
    modulo: params.get("modulo") ?? "",
    frente: params.get("frente") ?? "",
    orgao: params.get("orgao") ?? "",
    sprint: params.get("sprint") ?? "",
  };
  const filtrar: Filtrar = (campo, valor) => {
    const novo = new URLSearchParams(params.toString());
    if (valor && valor !== filtros[campo]) novo.set(campo, valor);
    else novo.delete(campo); // clicar de novo no mesmo item limpa o filtro
    router.replace(`${pathname}${novo.size ? `?${novo}` : ""}`, { scroll: false });
  };
  const limpar = () => router.replace(pathname, { scroll: false });

  const recorte = filtrarItens(itens, filtros);
  const dataRetrato = new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR");
  const filtroRelatorio = `${descreverFiltros(filtros) || "Projeto inteiro"} · retrato do TFS em ${dataRetrato}`;

  // Três níveis de leitura (pedido do Fabio, 11/2026): Secretário → Gerente → Detalhamento.
  const niveis: { id: string; label: string; descricao: string; abas: TabItem[] }[] = [
    {
      id: "secretario", label: "1. Visão do Secretário", descricao: "Prazo, consumo do contrato, entregas, decisões e o que está em produção.",
      abas: [
        { id: "executivo", label: "Situação do projeto", content: <ExecutivoTab itens={recorte} sprints={sprints} contrato={contrato} etp={etp} hoje={hoje} onIrPara={(a) => { setNivel("gerente"); setAbaAtiva(a); }} /> },
      ],
    },
    {
      id: "gerente", label: "2. Visão do Gerente", descricao: "Módulos e responsáveis, entregas do mês, pendências e aceite.",
      abas: [
        { id: "modulos", label: "Módulos e frentes", content: <ModulosTab itens={recorte} sprints={sprints} hoje={hoje} filtros={filtros} filtrar={filtrar} /> },
        { id: "pendencias", label: "Pendências e problemas", content: <PendenciasTab itens={recorte} filtros={filtros} filtrar={filtrar} /> },
        { id: "fiscalizacao", label: "Sprints, entregas e aceite", content: <FiscalizacaoTab itens={recorte} sprints={sprints} hoje={hoje} /> },
      ],
    },
    {
      id: "detalhe", label: "3. Detalhamento", descricao: "Origem dos números: UST por atividade, órgãos, painel do time e qualidade do dado.",
      abas: [
        { id: "ust", label: "UST da X-VIA × ETP", content: <UstTab itens={recorte} etp={etp} contrato={contrato} /> },
        { id: "orgaos", label: "Órgãos e pontos focais", content: <StakeholdersTab itens={recorte} stakeholders={stakeholders} filtros={filtros} filtrar={filtrar} /> },
        { id: "acompanhamento", label: "Acompanhamento do time", content: <AcompanhamentoTab {...painel} /> },
        { id: "qualidade", label: "Qualidade dos dados", content: <QualidadeTab itens={recorte} etp={etp} contrato={contrato} /> },
      ],
    },
  ];
  const nivelAtual = niveis.find((n) => n.id === nivel) ?? niveis[0];
  const abas = nivelAtual.abas;
  const trocarNivel = (id: string) => {
    setNivel(id);
    setAbaAtiva(niveis.find((n) => n.id === id)?.abas[0].id ?? "executivo");
  };

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <ContentTopBar title="Projeto X-VIA">
        <ExportarRelatorioButton secoes={abas.map((a) => ({ id: a.id, label: a.label }))} ativaId={abaAtiva} filtro={filtroRelatorio} />
      </ContentTopBar>
      <main className="flex-1 p-4 md:p-6 min-w-0">
        <RelatorioCapa titulo="Projeto X-VIA" filtro={filtroRelatorio} />
        <nav aria-label="Nível de leitura" className="grid gap-2 grid-cols-1 sm:grid-cols-3 mb-4 print:hidden">
          {niveis.map((n) => {
            const ativo = n.id === nivelAtual.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => trocarNivel(n.id)}
                aria-pressed={ativo}
                className="text-left"
                style={{
                  border: `1px solid ${ativo ? "var(--ds-color-primary-600)" : "var(--ds-color-border)"}`,
                  borderRadius: "var(--ds-radius-md)",
                  padding: "10px 14px",
                  background: ativo ? "var(--ds-color-background-muted)" : "var(--ds-color-background)",
                }}
              >
                <span className="block text-sm font-semibold" style={{ color: ativo ? "var(--ds-color-primary-600)" : "var(--ds-color-text-primary)" }}>{n.label}</span>
                <span className="block text-xs" style={{ color: "var(--ds-color-text-muted)" }}>{n.descricao}</span>
              </button>
            );
          })}
        </nav>
        <FiltrosBar itens={itens} filtros={filtros} filtrar={filtrar} limpar={limpar} total={recorte.length} dataRetrato={dataRetrato} />
        <Tabs items={abas} ativa={abas.some((a) => a.id === abaAtiva) ? abaAtiva : abas[0].id} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
