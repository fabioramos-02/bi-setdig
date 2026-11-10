"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { EmptyCard } from "@/components/ds/EmptyCard";
import type { AtualizacaoAno, AtualizacaoDia } from "@/lib/data";

export type DadosAtualizacoes = {
  porAno: AtualizacaoAno[];
  porDia: AtualizacaoDia[];
  atualizadoEm: string | null;
};

type Totais = { cartas: number; revisadas: number };
type LinhaOrgao = Totais & { orgao: string };

const ORGAOS_VISIVEIS = 8;
const fmt = (n: number) => n.toLocaleString("pt-BR");
const DIA_MS = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

function somar(linhas: AtualizacaoDia[]): Totais {
  const cartas = new Set<number>();
  const revisadas = new Set<number>();
  for (const l of linhas) {
    cartas.add(l.s);
    if (l.r > 0) revisadas.add(l.s);
  }
  return { cartas: cartas.size, revisadas: revisadas.size };
}

/** Período anterior de mesmo tamanho, logo antes do escolhido (base da comparação). */
function periodoAnterior(inicio: string, fim: string) {
  const i = Date.parse(`${inicio}T00:00:00Z`);
  const f = Date.parse(`${fim}T00:00:00Z`);
  const dias = Math.round((f - i) / DIA_MS) + 1;
  return { inicio: iso(i - dias * DIA_MS), fim: iso(i - DIA_MS) };
}

function comparacao(atual: number, antes: number): string | undefined {
  if (!antes) return undefined;
  const pct = Math.round((100 * (atual - antes)) / antes);
  return `${pct >= 0 ? "+" : ""}${pct}% em relação ao período anterior (${fmt(antes)})`;
}

/** Atualizações das cartas de serviço (pedido da Ari para o relatório de gestão,
 * 10/11/2026). Tudo sai do histórico do sistema das Cartas, sem estatística de
 * acesso: os cartões e a tabela por órgão seguem o período escolhido no filtro;
 * o "ano a ano" mostra o histórico inteiro, que foi o formato que a Ari aprovou. */
export function AtualizacoesTab({
  dados,
  range,
  rotuloPeriodo,
}: {
  dados: DadosAtualizacoes;
  range: { inicio: string; fim: string };
  rotuloPeriodo: string;
}) {
  const [verTodos, setVerTodos] = useState(false);

  const noPeriodo = useMemo(
    () => dados.porDia.filter((l) => l.d >= range.inicio && l.d <= range.fim),
    [dados.porDia, range.inicio, range.fim],
  );
  const antes = useMemo(() => {
    const p = periodoAnterior(range.inicio, range.fim);
    return somar(dados.porDia.filter((l) => l.d >= p.inicio && l.d <= p.fim));
  }, [dados.porDia, range.inicio, range.fim]);
  const total = useMemo(() => somar(noPeriodo), [noPeriodo]);

  const porOrgao = useMemo(() => {
    const grupos = new Map<string, AtualizacaoDia[]>();
    for (const l of noPeriodo) grupos.set(l.o, [...(grupos.get(l.o) ?? []), l]);
    return [...grupos.entries()]
      .map(([orgao, linhas]): LinhaOrgao => ({ orgao, ...somar(linhas) }))
      .sort((a, b) => b.cartas - a.cartas);
  }, [noPeriodo]);

  if (dados.porAno.length === 0) {
    return <EmptyCard message="O histórico de atualizações das cartas ainda não foi carregado. Ele aparece aqui depois da próxima carga." />;
  }

  const extraidoEm = dados.atualizadoEm ? new Date(dados.atualizadoEm).toLocaleDateString("pt-BR") : null;
  const anoAtual = dados.atualizadoEm ? new Date(dados.atualizadoEm).getFullYear() : null;
  const rotuloAno = (ano: number, i: number) =>
    i === 0 ? `${ano} (desde abril)` : ano === anoAtual && extraidoEm ? `${ano} (até ${extraidoEm.slice(0, 5)})` : String(ano);

  const visiveis = verTodos ? porOrgao : porOrgao.slice(0, ORGAOS_VISIVEIS);
  const colunasOrgao: Coluna<LinhaOrgao>[] = [
    { key: "orgao", label: "Órgão", sortable: true, sortValue: (r) => r.orgao, render: (r) => r.orgao },
    { key: "cartas", label: "Cartas alteradas", align: "right", sortable: true, sortValue: (r) => r.cartas, render: (r) => fmt(r.cartas) },
    { key: "revisadas", label: "Cartas revisadas", align: "right", sortable: true, sortValue: (r) => r.revisadas, render: (r) => fmt(r.revisadas) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <details
        className="text-sm"
        style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", background: "var(--ds-color-background-muted)", padding: "12px 16px" }}
      >
        <summary className="cursor-pointer font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
          De onde vêm esses números?
        </summary>
        <div className="mt-3 flex flex-col gap-2" style={{ color: "var(--ds-color-text-secondary)" }}>
          <p>
            Do <b>sistema onde os órgãos escrevem e mantêm as cartas de serviço</b> do Portal ms.gov.br. Toda vez que uma
            carta é criada, editada, revisada ou tem uma etapa mudada, o sistema guarda um registro com a data.
          </p>
          <p>
            Contamos só o que <b>foi aprovado e chegou ao Portal</b>, e só as cartas que estão no ar hoje. Pedidos pendentes ou
            recusados ficam de fora.
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>
              <b>Cartas revisadas:</b> cartas que passaram pela revisão anual obrigatória, com conferência e
              validação das informações pelo órgão, mas não houve necessidade de alterações.
            </li>
            <li>
              <b>Cartas alteradas:</b> cartas que, além de passarem pela revisão obrigatória, tiveram seu
              conteúdo atualizado, com alterações nas informações dos serviços prestados, ao longo do ano.
            </li>
          </ul>
          <p style={{ color: "var(--ds-color-text-muted)" }}>
            O registro começa em abril de 2023.{extraidoEm ? ` Números atualizados em ${extraidoEm}.` : ""}
          </p>
        </div>
      </details>

      <StoryCard
        anchor={
          total.cartas > 0 ? (
            <>
              Em {rotuloPeriodo}, <b>{fmt(total.cartas)}</b> cartas de serviço foram atualizadas.
            </>
          ) : (
            <>Nenhuma carta foi alterada em {rotuloPeriodo}.</>
          )
        }
        caption={total.cartas > 0 ? `${fmt(total.revisadas)} delas passaram por revisão.` : undefined}
        comoLer="Os cartões e a tabela por órgão seguem o período escolhido no filtro. A comparação é com o período de mesmo tamanho logo antes."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <MetricCard label="Cartas alteradas" value={total.cartas} sub={comparacao(total.cartas, antes.cartas)} />
        <MetricCard label="Cartas revisadas" value={total.revisadas} sub={comparacao(total.revisadas, antes.revisadas)} />
      </div>

      <DashboardSection
        title={`Por órgão, em ${rotuloPeriodo}`}
        action={
          porOrgao.length > 0 ? (
            <ExportCsvButton
              rows={porOrgao.map((r) => ({ orgao: r.orgao, cartas_alteradas: r.cartas, cartas_revisadas: r.revisadas }))}
              filename={`atualizacoes-cartas-por-orgao-${range.inicio}-a-${range.fim}.csv`}
            />
          ) : undefined
        }
      >
        {porOrgao.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>Nenhum órgão alterou cartas nesse período.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
              {porOrgao.length > ORGAOS_VISIVEIS && !verTodos
                ? `Os ${ORGAOS_VISIVEIS} órgãos com mais cartas alteradas, de ${porOrgao.length}. A planilha traz todos.`
                : `${porOrgao.length} órgãos alteraram cartas no período.`}
            </p>
            <div className="overflow-x-auto min-w-0">
              <div className="min-w-[480px]">
                <DataTable columns={colunasOrgao} rows={visiveis} rowKey={(r) => r.orgao} />
              </div>
            </div>
            {porOrgao.length > ORGAOS_VISIVEIS && (
              <button
                type="button"
                onClick={() => setVerTodos((v) => !v)}
                className="self-start text-sm font-medium hover:underline"
                style={{ color: "var(--ds-color-primary-600)" }}
              >
                {verTodos ? "Mostrar só os principais" : `Ver todos os ${porOrgao.length} órgãos`}
              </button>
            )}
          </div>
        )}
      </DashboardSection>

      <DashboardSection title="Ano a ano">
        <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          O histórico inteiro, para comparar os anos. Não muda com o filtro.
        </p>
        <div className="overflow-x-auto min-w-0">
          <table className="w-full min-w-[480px] text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--ds-color-background-muted)", color: "var(--ds-color-text-secondary)" }}>
                <th className="text-left p-2">Ano</th>
                <th className="text-right p-2">Cartas alteradas</th>
                <th className="text-right p-2">Cartas com revisão</th>
              </tr>
            </thead>
            <tbody>
              {dados.porAno.map((a, i) => (
                <tr key={a.ano} className="border-t" style={{ borderColor: "var(--ds-color-border)" }}>
                  <td className="p-2 font-medium" style={{ color: "var(--ds-color-text-primary)" }}>{rotuloAno(a.ano, i)}</td>
                  <td className="p-2 text-right">{fmt(a.cartasAlteradas)}</td>
                  <td className="p-2 text-right">{fmt(a.cartasRevisadas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSection>
    </div>
  );
}
