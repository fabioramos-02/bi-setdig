"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { RankingHorizontal } from "@/components/charts/RankingHorizontal";
import { StoryCard } from "@/components/dashboard/StoryCard";
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
import {
  cauda,
  categoriaLider,
  cobertura,
  contagemOrgaosUnicos,
  fraseAncoraCategoria,
  pontosAtencaoCategorias,
  ranking,
  saudeConcentracao,
  topNSharePct,
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
  const lider = categoriaLider(rankings);
  const semaforo = saudeConcentracao(rankings);
  const total = totalAcessos(rankings);
  const cob = cobertura(rankings);
  const cd = cauda(rankings);
  const top5 = topNSharePct(rankings, 5);
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

      {/* 3. Ranking horizontal — reage ao filtro */}
      <StoryCard
        anchor={total > 0 ? `As 5 categorias mais usadas concentram ${top5.toFixed(0)}% dos acessos.` : "Sem acessos identificados por categoria no período."}
        caption="Ordenado do mais para o menos acessado no período selecionado."
        comoLer="Cada barra mostra os acessos da categoria e sua fatia do total identificado no período. Categorias sem barra ainda não tiveram acesso no recorte."
      >
        <ChartLoading status={status} height={480}>
          <RankingHorizontal
            itens={rankings.map((r) => ({
              label: r.categoria,
              valor: r.acessos,
              sharePct: r.sharePct,
              sub: r.soAtalhoWeb
                ? "atalho externo · sem medição"
                : `${r.totalServicos} serviço${r.totalServicos === 1 ? "" : "s"}`,
              icone: r.icone,
            }))}
            chipsPorItem={(cat) => orgaosDe(cat, categoriaOrgaos)}
          />
        </ChartLoading>
      </StoryCard>

      {/* 4. Grid clicável — explorar por categoria */}
      <DashboardSection
        title="Explorar por categoria"
        action={<ExportCsvButton rows={csv} filename="app-catalogo-servicos" />}
      >
        <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Clique numa categoria para ver a lista de serviços e quantos acessos cada um teve no período.
        </p>
        <ChartLoading status={status} height={520}>
        <div className="grid gap-4 grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {categorias.map((c) => {
            const ativo = c.categoria === sel;
            const linhaRanking = rankings.find((r) => r.categoria === c.categoria);
            const acessos = linhaRanking?.acessos ?? 0;
            const share = linhaRanking?.sharePct ?? 0;
            return (
              <button
                key={c.categoria}
                type="button"
                onClick={() => setSel(ativo ? null : c.categoria)}
                className="flex flex-col items-center text-center rounded p-4 transition-shadow hover:shadow-md"
                style={{
                  background: "var(--ds-color-background)",
                  border: ativo ? "2px solid var(--ds-color-primary-600)" : "1px solid var(--ds-color-border)",
                }}
              >
                <span
                  className="material-icons mb-2"
                  style={{ color: "var(--ds-color-primary-600)", fontSize: 32 }}
                  aria-hidden
                >
                  {c.icone}
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--ds-color-text-secondary)" }}>
                  {c.categoria}
                </span>
                <span className="text-xs mt-1" style={{ color: "var(--ds-color-text-muted)" }}>
                  {linhaRanking?.soAtalhoWeb ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded"
                      style={{
                        background: "var(--ds-color-background-muted)",
                        color: "var(--ds-color-text-secondary)",
                      }}
                    >
                      atalho externo
                    </span>
                  ) : (
                    <>
                      {c.total} serviços · {acessos.toLocaleString("pt-BR")} acessos
                      {share > 0 && ` · ${share.toFixed(1)}%`}
                    </>
                  )}
                </span>
                <div className="mt-2">
                  <OrgaosChips orgaos={orgaosDe(c.categoria, categoriaOrgaos)} tamanho="xs" align="center" />
                </div>
                {total > 0 && !linhaRanking?.soAtalhoWeb && (
                  <div
                    className="w-full h-1 mt-3 rounded overflow-hidden"
                    style={{ background: "var(--ds-color-background-muted)" }}
                  >
                    <div
                      style={{
                        width: `${share}%`,
                        height: "100%",
                        background: "var(--ds-color-primary-600)",
                      }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        </ChartLoading>

        {sel && (
          <div className="mt-6">
            <div className="mb-3 flex flex-col gap-1">
              <h3 className="text-sm font-semibold" style={{ color: "var(--ds-color-text-secondary)" }}>
                {sel} — {servicosSel.length} serviços · {rankingSel.reduce((a, l) => a + l.acessos, 0).toLocaleString("pt-BR")} acessos no período
              </h3>
              <OrgaosChips orgaos={orgaosDe(sel, categoriaOrgaos)} tamanho="sm" align="start" />
            </div>
            <ChartLoading status={status} height={Math.max(120, servicosSel.length * 44)}>
              {rankingSel.reduce((a, l) => a + l.acessos, 0) > 0 ? (
                <RankingHorizontal
                  itens={rankingSel.map((l) => ({
                    label: l.servico,
                    valor: l.acessos,
                    sharePct: l.sharePct,
                    sub: l.tipo === "nativo" ? "nativo" : "web",
                    href: l.tipo === "web" && l.url ? l.url : undefined,
                  }))}
                />
              ) : (
                <RankingHorizontal
                  itens={servicosSel.map((s) => ({
                    label: s.servico,
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

      {/* 5. Nativos × Web (colunas verticais com valores dentro) */}
      <DashboardSection title="Nativos × web">
        <BarChart
          data={[
            { tipo: "Nativos (tela no app)", quantidade: resumo.nativo },
            { tipo: "Web (abre site externo)", quantidade: resumo.web },
          ]}
          xKey="tipo"
          yKey="quantidade"
          height={280}
          mostrarValorNaBarra
          mostrarTodosTicks
          corPorIndice={(i) => (i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)")}
        />
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
