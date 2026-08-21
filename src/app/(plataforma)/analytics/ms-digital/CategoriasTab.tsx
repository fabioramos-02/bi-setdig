"use client";

import { useMemo, useState } from "react";
import { RankingHorizontal } from "@/components/charts/RankingHorizontal";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { normalizar, folhaDe, contagemPorServico } from "@/lib/servico-app-classifier";
import type { ServicoCatalogo, Servico, CategoriaOrgaos } from "@/lib/data";
import { orgaosDe, type ResumoCatalogo, type CategoriaResumo } from "@/lib/catalogo-app";
import type { FatiaCategoria } from "@/components/charts/CategoryDonut";
import { OrgaosChips } from "@/components/dashboard/OrgaosChips";
import { CategoriaCard } from "@/components/dashboard/CategoriaCard";
import { NativoWebBar } from "@/components/dashboard/NativoWebBar";
import { OrgaosPorCategoriaSection } from "@/components/dashboard/OrgaosPorCategoriaSection";
import {
  cauda,
  categoriaLider,
  cobertura,
  contagemOrgaosUnicos,
  fraseAncoraCategoria,
  pontosAtencaoCategorias,
  porOrgao,
  ranking,
  saudeConcentracao,
  totalAcessos,
} from "@/lib/insights-categorias";

const CORES_SAUDE = {
  verde: "var(--ds-color-success)",
  amarelo: "var(--ds-color-warning)",
  vermelho: "var(--ds-color-danger)",
} as const;

/** Aba "Categorias do app" — Executive Briefing.
 *  Situação Geral → 4 KPIs → Ranking horizontal → Grid clicável (drill) →
 *  Nativos × Web → Pontos de atenção. Reage ao filtro de período. */
export function CategoriasTab({
  servicos,
  resumo,
  categorias,
  acessosServico,
  acessosCategoria,
  categoriaOrgaos,
  status,
}: {
  servicos: ServicoCatalogo[];
  resumo: ResumoCatalogo;
  categorias: CategoriaResumo[];
  acessosServico: Servico[];
  acessosCategoria: FatiaCategoria[];
  categoriaOrgaos: CategoriaOrgaos;
  status: StatusIntervalo;
}) {
  const [sel, setSel] = useState<string | null>(null);

  const rankings = useMemo(() => ranking(categorias, acessosCategoria), [categorias, acessosCategoria]);
  const orgaosUnicos = useMemo(() => contagemOrgaosUnicos(categoriaOrgaos, rankings), [categoriaOrgaos, rankings]);
  const orgaosResponsaveis = useMemo(() => porOrgao(categoriaOrgaos, rankings), [categoriaOrgaos, rankings]);
  const lider = categoriaLider(rankings);
  const semaforo = saudeConcentracao(rankings);
  const total = totalAcessos(rankings);
  const cob = cobertura(rankings);
  const cd = cauda(rankings);
  const alertas = pontosAtencaoCategorias(rankings);
  const categoriasComUso = rankings.filter((r) => r.totalServicos > 0 && r.acessos > 0).length;

  const servicosSel = sel ? servicos.filter((s) => s.categoria === sel) : [];
  const contagemServico = contagemPorServico(acessosServico);
  const rankingSel = useMemo(() => {
    if (!sel) return [];
    const linhas = servicosSel.map((s) => {
      const acessos = contagemServico.get(normalizar(folhaDe(s.servico))) ?? 0;
      return { servico: s.servico, acessos, tipo: s.tipo, ativo: s.ativo, url: s.url };
    });
    const totalSel = linhas.reduce((a, l) => a + l.acessos, 0) || 1;
    return linhas
      .map((l) => ({ ...l, sharePct: (100 * l.acessos) / totalSel }))
      .sort((a, b) => b.acessos - a.acessos);
  }, [sel, servicosSel, contagemServico]);

  const csv = servicos.map((s) => ({
    Categoria: s.categoria,
    Serviço: s.servico,
    Tipo: s.tipo === "nativo" ? "Nativo" : "Web",
    Situação: s.ativo ? "Ativo" : "Inativo",
    URL: s.url ?? "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />

      {/* 1. Situação Geral */}
      <DashboardSection title="Situação geral">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div
            aria-hidden
            style={{ background: CORES_SAUDE[semaforo.nivel] }}
            className="w-3 h-3 rounded-full mt-2 shrink-0"
          />
          <div>
            <p style={{ color: "var(--ds-color-text-primary)" }} className="text-base font-semibold">
              {semaforo.texto}
            </p>
            <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm mt-2">
              {fraseAncoraCategoria(rankings)} O app reúne {resumo.total} serviços em {resumo.categorias} categorias
              {orgaosUnicos.total > 0 && (
                <>, sustentadas por <strong>{orgaosUnicos.total}</strong> órgãos do Estado</>
              )}
              .{" "}
              {total > 0 && (
                <>
                  Total de acessos identificados no período: <strong>{total.toLocaleString("pt-BR")}</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      </DashboardSection>

      {/* 2. KPIs de gestão */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Categoria líder"
          value={lider?.categoria ?? "—"}
          sub={lider ? `${lider.sharePct.toFixed(1)}% dos acessos` : "sem acessos no período"}
        />
        <MetricCard
          label="Cobertura de uso"
          value={`${cob.toFixed(0)}%`}
          sub={`${categoriasComUso} de ${resumo.categorias} categorias com acesso`}
        />
        <MetricCard
          label="Cauda longa"
          value={`${cd.sharePct.toFixed(0)}%`}
          sub={`${cd.qtd} categoria${cd.qtd === 1 ? " tem" : "s têm"} menos de 5% cada`}
        />
        <MetricCard label="Acessos no período" value={total} sub="reagem ao filtro à esquerda" />
      </div>

      {/* 3. Grid clicável — Top 5 destaque + demais recolhidos */}
      <DashboardSection
        title="Explorar por categoria"
        action={<ExportCsvButton rows={csv} filename="app-catalogo-servicos" />}
      >
        <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Clique numa categoria para ver a lista de serviços e quantos acessos cada um teve no período.
        </p>
        <ChartLoading status={status} height={520}>
          {(() => {
            const rankingsOrdenados = [...rankings].sort((a, b) => b.acessos - a.acessos);
            const top5 = rankingsOrdenados.slice(0, 5);
            const demais = rankingsOrdenados.slice(5);
            const shareMax = Math.max(1, ...rankingsOrdenados.map((r) => r.sharePct));
            const acessosDemais = demais.reduce((a, r) => a + r.acessos, 0);
            const shareDemais = demais.reduce((a, r) => a + r.sharePct, 0);
            const renderCard = (r: typeof rankingsOrdenados[number], variante: "destaque" | "compacto") => (
              <CategoriaCard
                key={r.categoria}
                categoria={r.categoria}
                icone={r.icone}
                totalServicos={r.totalServicos}
                acessos={r.acessos}
                sharePct={r.sharePct}
                soAtalhoWeb={r.soAtalhoWeb}
                inativa={r.inativa}
                orgaos={orgaosDe(r.categoria, categoriaOrgaos)}
                ativo={r.categoria === sel}
                variante={variante}
                onClick={() => setSel(r.categoria === sel ? null : r.categoria)}
                shareMax={shareMax}
                totalGeral={total}
              />
            );
            return (
              <div className="flex flex-col gap-6">
                {top5.length > 0 && (
                  <div>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wide mb-3"
                      style={{ color: "var(--ds-color-text-muted)" }}
                    >
                      Top 5 mais acessadas
                    </h4>
                    <div className="grid gap-4 grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                      {top5.map((r) => renderCard(r, "destaque"))}
                    </div>
                  </div>
                )}
                {demais.length > 0 && (
                  <details className="print-expandir">
                    <summary
                      className="text-sm font-medium cursor-pointer select-none"
                      style={{ color: "var(--ds-color-text-secondary)" }}
                    >
                      Ver outras {demais.length} categorias
                      {total > 0 && ` · ${shareDemais.toFixed(1)}% dos acessos (${acessosDemais.toLocaleString("pt-BR")})`}
                    </summary>
                    <div className="grid gap-3 mt-3 grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3">
                      {demais.map((r) => renderCard(r, "compacto"))}
                    </div>
                  </details>
                )}
              </div>
            );
          })()}
        </ChartLoading>

        {sel && (
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--ds-color-border)" }}>
            <div className="mb-4 flex flex-col gap-2">
              <h3 className="text-lg font-bold leading-tight" style={{ color: "var(--ds-color-text-primary)" }}>
                {sel}
              </h3>
              <p className="text-base tabular-nums" style={{ color: "var(--ds-color-text-secondary)" }}>
                {servicosSel.length} serviços · {rankingSel.reduce((a, l) => a + l.acessos, 0).toLocaleString("pt-BR")} acessos no período
              </p>
              <OrgaosChips orgaos={orgaosDe(sel, categoriaOrgaos)} tamanho="sm" align="start" />
            </div>
            <ChartLoading status={status} height={Math.max(120, servicosSel.length * 44)}>
              {rankingSel.reduce((a, l) => a + l.acessos, 0) > 0 ? (
                <RankingHorizontal
                  itens={rankingSel.map((l) => ({
                    label: l.ativo ? l.servico : `${l.servico} · inativo`,
                    valor: l.acessos,
                    sharePct: l.sharePct,
                    sub: l.tipo === "nativo" ? "nativo" : "web",
                    href: l.tipo === "web" && l.url ? l.url : undefined,
                  }))}
                />
              ) : (
                <RankingHorizontal
                  itens={servicosSel.map((s) => ({
                    label: s.ativo ? s.servico : `${s.servico} · inativo`,
                    valor: 0,
                    sharePct: 0,
                    sub: s.tipo === "nativo" ? "nativo" : "web",
                    href: s.tipo === "web" && s.url ? s.url : undefined,
                  }))}
                />
              )}
            </ChartLoading>
          </div>
        )}
      </DashboardSection>

      {/* 4. Órgãos responsáveis — inversão do mapa: órgão → categorias que sustenta */}
      <DashboardSection title="Órgãos por trás das categorias">
        <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Cada linha mostra um órgão do Estado, quantas categorias do app ele sustenta e
          quanto do uso passa por essas categorias no período. Órgãos que aparecem em mais
          de uma categoria somam o alcance de todas.
        </p>
        <OrgaosPorCategoriaSection orgaos={orgaosResponsaveis} totalGeral={total} />
      </DashboardSection>

      {/* 5. Nativos × Web — barra 100% empilhada horizontal */}
      <DashboardSection title="Nativos × web">
        <NativoWebBar nativo={resumo.nativo} web={resumo.web} />
        <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Nativo = tela dentro do app. Web = manda o cidadão para um site externo. Quanto mais nativo, mais o serviço
          vive dentro do app.
        </p>
      </DashboardSection>

      {/* 6. Pontos de atenção */}
      {alertas.length > 0 && (
        <DashboardSection title="Pontos de atenção">
          <ul className="flex flex-col gap-2">
            {alertas.map((p, i) => (
              <li
                key={i}
                style={{ color: "var(--ds-color-text-primary)" }}
                className="text-sm flex gap-2 items-start"
              >
                <span
                  aria-hidden
                  style={{
                    background:
                      p.severidade === "alerta"
                        ? "var(--ds-color-danger)"
                        : p.severidade === "atencao"
                          ? "var(--ds-color-warning)"
                          : "var(--ds-color-primary-600)",
                  }}
                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                />
                <span>{p.texto}</span>
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}
    </div>
  );
}
