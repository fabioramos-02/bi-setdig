"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import type { InventarioOrgao, CartaRelacao } from "@/lib/data";
import type { LiveServicos } from "./ServicosClient";

type SetorGrupo = { setor: string; total: number };
type OrgaoGrupo = { orgaoSigla: string; total: number; setores: SetorGrupo[] };

/** Demanda (acessos no período) × oferta (nº de cartas cadastradas) por órgão
 * e por setor. Setor só aparece depois de rodar o pipeline com a SQL
 * estendida (VPN) — sem ele, a tabela de órgãos cai pro agregado plano
 * (InventarioOrgao) sem afford de expandir, e a seção de setor mostra aviso
 * em vez de dado falso. */
export function OrgaosSetoresTab({
  live,
  orgaos,
  cartas,
  status,
  rotuloPeriodo,
}: {
  live: LiveServicos | null;
  orgaos: InventarioOrgao[];
  cartas: CartaRelacao[];
  status: StatusIntervalo;
  rotuloPeriodo: string;
}) {
  const temSetor = useMemo(() => cartas.some((c) => c.setor), [cartas]);

  // Oferta: cartas ativas por órgão, com o total do órgão = soma dos setores
  // (não o agregado InventarioOrgao.ativos, que pode contar carta sem setor).
  // Mostra TODOS os órgãos (não só top N) — é inventário, não ranking, e um
  // corte escondido já confundiu (soma dos 10 primeiros não batendo com o
  // total de cartas ativas pareceu bug de dado quando era só truncamento).
  const grupos: OrgaoGrupo[] = useMemo(() => {
    if (!temSetor) {
      return orgaos
        .map((o) => ({ orgaoSigla: o.orgaoSigla, total: o.ativos, setores: [] as SetorGrupo[] }))
        .sort((a, b) => b.total - a.total);
    }
    const porOrgao = new Map<string, Map<string, number>>();
    for (const c of cartas) {
      if (!c.setor) continue;
      const porSetor = porOrgao.get(c.orgaoSigla) ?? new Map<string, number>();
      porSetor.set(c.setor, (porSetor.get(c.setor) ?? 0) + 1);
      porOrgao.set(c.orgaoSigla, porSetor);
    }
    return [...porOrgao.entries()]
      .map(([orgaoSigla, porSetor]) => {
        const setores = [...porSetor.entries()]
          .map(([setor, total]) => ({ setor, total }))
          .sort((a, b) => b.total - a.total);
        return { orgaoSigla, total: setores.reduce((acc, s) => acc + s.total, 0), setores };
      })
      .sort((a, b) => b.total - a.total);
  }, [cartas, orgaos, temSetor]);

  const totalGeral = grupos.reduce((acc, g) => acc + g.total, 0);

  const avisoSetor = (
    <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
      A informação de setor ainda não está disponível — depende de uma nova extração do inventário.
    </p>
  );

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado
        status={status}
        mensagemFallback="Não foi possível buscar os acessos desse período agora — tenta um período menor ou tenta de novo em instantes."
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <DashboardSection title={`Órgãos com mais acessos ${rotuloPeriodo}`}>
          <ChartLoading status={status} height={260}>
            <RankingBarChart itens={(live?.porOrgao ?? []).slice(0, 10).map((o) => ({ label: o.rotulo, valor: o.visitas }))} />
          </ChartLoading>
        </DashboardSection>
        <DashboardSection title="Órgãos com mais serviços cadastrados">
          {!temSetor && (
            <p className="mb-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
              Detalhamento por setor ainda não disponível.
            </p>
          )}
          <OrgaoSetorTable grupos={grupos} expansivel={temSetor} />
          <p className="mt-3 pt-3 text-xs" style={{ color: "var(--ds-color-text-muted)", borderTop: "1px solid var(--ds-color-border)" }}>
            Total: {totalGeral.toLocaleString("pt-BR")} serviços em {grupos.length} órgãos.
          </p>
        </DashboardSection>
      </div>

      <DashboardSection title={`Setores com mais acessos ${rotuloPeriodo}`}>
        {live && live.porSetor.length > 0 ? (
          <ChartLoading status={status} height={260}>
            <RankingBarChart itens={live.porSetor.slice(0, 10).map((s) => ({ label: s.rotulo, valor: s.visitas }))} />
          </ChartLoading>
        ) : (
          avisoSetor
        )}
      </DashboardSection>
    </div>
  );
}

/** Linha = órgão (sigla + total). Clicar expande os setores dele — só quando
 * `expansivel` (dado de setor disponível), senão é só a lista plana. */
function OrgaoSetorTable({ grupos, expansivel }: { grupos: OrgaoGrupo[]; expansivel: boolean }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const toggle = (sigla: string) =>
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(sigla)) next.delete(sigla);
      else next.add(sigla);
      return next;
    });

  return (
    <ul className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
      {grupos.map((g) => {
        const aberto = expansivel && abertos.has(g.orgaoSigla);
        return (
          <li key={g.orgaoSigla}>
            <button
              type="button"
              onClick={() => expansivel && toggle(g.orgaoSigla)}
              aria-expanded={expansivel ? aberto : undefined}
              className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded text-sm text-left"
              style={{ background: "var(--ds-color-background-muted)", cursor: expansivel ? "pointer" : "default" }}
            >
              <span className="flex items-center gap-2 min-w-0">
                {expansivel && (
                  <span className="material-icons shrink-0" style={{ fontSize: 18, color: "var(--ds-color-text-muted)" }} aria-hidden>
                    {aberto ? "expand_less" : "expand_more"}
                  </span>
                )}
                <span className="font-medium truncate" style={{ color: "var(--ds-color-text-secondary)" }}>
                  {g.orgaoSigla}
                </span>
              </span>
              <span className="shrink-0 font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                {g.total.toLocaleString("pt-BR")}
              </span>
            </button>
            {aberto && (
              <ul className="ml-7 mt-1 mb-2 flex flex-col gap-1">
                {g.setores.map((s) => (
                  <li
                    key={s.setor}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 px-3"
                    style={{ color: "var(--ds-color-text-muted)" }}
                  >
                    <span className="truncate">{s.setor}</span>
                    <span className="shrink-0">{s.total.toLocaleString("pt-BR")}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
