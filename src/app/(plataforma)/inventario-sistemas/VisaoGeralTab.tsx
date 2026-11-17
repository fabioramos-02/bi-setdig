"use client";

import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import {
  panoramaInventario,
  pct,
  pontosDeAtencao,
  rankingResponsabilidade,
  type DadosInventario,
} from "@/lib/inventario-sistemas";
import { BarraPercentual, Chips, corTexto } from "./Comuns";

/** Visão Geral: onde olhar. Escala do inventário, quem concentra os sistemas,
 * quanto do Estado respondeu e o que precisa de atenção. */
export function VisaoGeralTab({ dados, onVerOrgao }: { dados: DadosInventario; onVerOrgao: (sigla: string) => void }) {
  const p = panoramaInventario(dados);
  const ranking = rankingResponsabilidade(dados.sistemas).slice(0, 12);
  const pontos = pontosDeAtencao(dados);
  const n = (v: number) => v.toLocaleString("pt-BR");

  return (
    <div className="flex flex-col gap-6">
      <StoryCard anchor={p.anchor} comoLer={p.comoLer} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Sistemas inventariados" value={p.nSistemas} sub={`de ${n(p.nOrgaosResponsaveis)} órgãos responsáveis`} />
        <MetricCard label="Órgãos enviaram inventário" value={`${n(p.nEnviaram)} de ${n(p.nOrgaos)}`} sub={`${p.pctEnviaram}% dos órgãos listados`} />
        <MetricCard
          label="Sistemas usados por outros órgãos"
          value={p.nCompartilhados}
          sub={`${p.pctCompartilhados}% do total · ${n(p.nIndicacoesUso)} citações de uso`}
        />
        <MetricCard
          label="Com criticidade avaliada"
          value={`${n(p.nAvaliados)} de ${n(p.nSistemas)}`}
          sub={p.nAvaliados === 0 ? "avaliação ainda não começou" : `${p.pctAvaliados}% avaliados`}
          cor={p.nAvaliados < p.nSistemas ? "var(--ds-color-warning)" : "var(--ds-color-success)"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0">
          <DashboardSection title="Quais órgãos concentram mais sistemas?">
            <RankingBarChart
              itens={ranking.map((r) => ({
                label: r.sigla,
                valor: r.total,
                sublabel: `${pct(r.total, p.nSistemas)}% dos sistemas`,
              }))}
              onSelect={(it) => onVerOrgao(it.label)}
            />
            <p className="bi-body-small mt-4" style={{ color: corTexto.secundario }}>
              Os 3 primeiros ({p.top3.map((t) => t.sigla).join(", ")}) respondem por {p.pctTop3}% dos sistemas.
              Clique em um órgão para ver o detalhe dele.
            </p>
          </DashboardSection>
        </div>

        <div className="min-w-0">
          <DashboardSection title="Quantos órgãos responderam?">
            <BarraPercentual
              rotulo="Enviaram inventário"
              pct={p.pctEnviaram}
              detalhe={`${n(p.nEnviaram)} de ${n(p.nOrgaos)}`}
              cor="var(--ds-color-success)"
            />
            <p className="bi-label mt-5 mb-2" style={{ color: corTexto.secundario }}>
              Ainda não enviaram ({n(p.naoEnviaram.length)})
            </p>
            <Chips itens={p.naoEnviaram} vazio="Todos os órgãos enviaram." />
            <p className="bi-caption mt-3" style={{ color: corTexto.apoio }}>
              Os sistemas desses órgãos entram porque outros órgãos citaram usá-los.
            </p>
          </DashboardSection>
        </div>
      </div>

      {pontos.length > 0 && (
        <DashboardSection title="Onde agir primeiro?">
          <ul className="grid gap-4 sm:grid-cols-2">
            {pontos.map((pt) => (
              <li
                key={pt.titulo}
                style={{
                  borderLeft: `4px solid ${pt.tom === "alerta" ? "var(--ds-color-warning)" : "var(--ds-color-info)"}`,
                  paddingLeft: "var(--ds-spacing-12)",
                }}
              >
                <div className="bi-card-title" style={{ color: corTexto.primario }}>{pt.titulo}</div>
                <p className="bi-body-small mt-1" style={{ color: corTexto.secundario }}>{pt.texto}</p>
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}
    </div>
  );
}
