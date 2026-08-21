"use client";

import { useMemo, useState } from "react";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import type { AcessoBotaoCarta } from "@/lib/data";
import {
  cartasComAltaConversao,
  cartasComBaixaConversao,
  corDaFaixa,
  destinosAgregados,
  faixaConversao,
  fraseAncoraAcessos,
  rotuloDaFaixa,
  taxaMediaPonderada,
} from "@/lib/insights-acessos-botao";

const PORTAL_BASE = "https://www.ms.gov.br";

/** Cliques em "Acessar serviço" por carta. Top-100 vem do dataset estático
 *  (breakdown por período fixo); qualquer carta selecionada abre drill-down
 *  live via /api/analytics/cartas/[slug]/acessos (ADR-010). Todo cálculo
 *  vive em insights-acessos-botao.ts. */
export function AcessarServicoTab({
  cartas,
  status,
  rotuloPeriodo,
}: {
  cartas: AcessoBotaoCarta[];
  status: StatusIntervalo;
  rotuloPeriodo: string;
}) {
  const frase = useMemo(() => fraseAncoraAcessos(cartas), [cartas]);
  const taxaMedia = useMemo(() => taxaMediaPonderada(cartas), [cartas]);
  const totalCliques = useMemo(() => cartas.reduce((a, c) => a + c.cliquesTotais, 0), [cartas]);
  const baixa = useMemo(() => cartasComBaixaConversao(cartas, 100), [cartas]);
  const alta = useMemo(() => cartasComAltaConversao(cartas, 20), [cartas]);
  const destinos = useMemo(() => destinosAgregados(cartas, 5), [cartas]);
  const top20 = useMemo(() => [...cartas].sort((a, b) => b.cliquesTotais - a.cliquesTotais).slice(0, 20), [cartas]);

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <AvisoSnapshotAproximado
        status={status}
        mensagemFallback={
          <>Este painel busca dados ao vivo. Enquanto isso, mostra o último resultado carregado — pode não refletir o período exato selecionado.</>
        }
      />

      <StoryCard anchor={frase.fraseAncora} comoLer={frase.comoLer} />

      {!frase.semDado && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 min-w-0">
          <MetricCard label="Cliques no botão Acessar Serviço" value={totalCliques} sub={rotuloPeriodo} />
          <MetricCard
            label="Taxa média de conversão"
            value={`${taxaMedia.toFixed(1)}%`}
            sub={`${rotuloDaFaixa(faixaConversao(taxaMedia))} entre as ${cartas.length} cartas mais visitadas`}
          />
          <MetricCard
            label="Cartas com conversão baixa (< 20%)"
            value={baixa.length}
            sub={baixa.length > 0 ? `de ${cartas.length} cartas com pelo menos 100 visitas` : "nenhuma no período"}
          />
        </div>
      )}

      {top20.length > 0 && (
        <DashboardSection title="Cartas com mais cliques no botão Acessar Serviço">
          <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Cada linha compara quantas pessoas abriram a carta (visitas, em cinza) e quantas seguiram pro sistema que resolve o serviço (cliques, em cor). A cor indica se a conversão está alta, média ou baixa. Clique numa carta pra ver os destinos.
          </p>
          <TabelaConversao cartas={top20} />
        </DashboardSection>
      )}

      {destinos.length > 0 && (
        <DashboardSection title="Pra onde as cartas mais mandam o cidadão">
          <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Somando os cliques de todas as {cartas.length} cartas mais visitadas, os {destinos.length} sistemas externos abaixo recebem a maior parte do fluxo saindo do portal.
          </p>
          <ul className="flex flex-col gap-2 min-w-0">
            {destinos.map((d) => (
              <li key={d.url} className="flex flex-wrap items-center justify-between gap-2 min-w-0 text-sm">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" style={{ color: "var(--ds-color-primary-600)", flex: "1 1 200px" }}>
                  {d.url} ↗
                </a>
                <span style={{ color: "var(--ds-color-text-secondary)" }}>
                  {d.cliques.toLocaleString("pt-BR")} cliques · {d.pct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}

      {alta.length > 0 && (
        <DashboardSection title="Cartas que estão cumprindo bem o papel">
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Cartas com pelo menos 20 cliques e conversão acima de 50% — o cidadão encontra o serviço e prossegue.
          </p>
          <ListaResumida cartas={alta.slice(0, 5)} />
        </DashboardSection>
      )}

      {baixa.length > 0 && (
        <DashboardSection title="Onde vale a pena olhar de perto">
          <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            Cartas com bastante visita (100+) mas menos de 20% dos cidadãos clicam em Acessar serviço. Pode indicar que o botão não é encontrado, o serviço não está disponível ou o destino está fora do ar.
          </p>
          <ListaResumida cartas={baixa.slice(0, 10)} />
        </DashboardSection>
      )}

      {frase.semDado && (
        <EmptyCard message="Ainda sem dado de cliques neste período. Assim que a próxima extração rodar ou o intervalo selecionado tiver movimento, esta aba se preenche." />
      )}
    </div>
  );
}

function TabelaConversao({ cartas }: { cartas: AcessoBotaoCarta[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const maxViews = Math.max(...cartas.map((c) => c.views), 1);
  return (
    <ul className="flex flex-col gap-1 min-w-0">
      {cartas.map((c) => {
        const faixa = faixaConversao(c.taxaConversaoPct);
        const cor = corDaFaixa(faixa);
        const pctViews = (c.views / maxViews) * 100;
        const pctCliques = (c.cliquesTotais / maxViews) * 100;
        const estaAberta = aberta === c.slug;
        return (
          <li key={c.slug} className="min-w-0 border-b" style={{ borderColor: "var(--ds-color-border)" }}>
            <button
              type="button"
              onClick={() => setAberta(estaAberta ? null : c.slug)}
              className="w-full text-left py-3 flex flex-col gap-1 min-w-0"
              style={{ color: "var(--ds-color-text-primary)" }}
              aria-expanded={estaAberta}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 min-w-0">
                <span className="font-medium truncate" style={{ flex: "1 1 220px" }}>
                  {c.titulo}
                  {c.orgaoSigla && (
                    <span className="ml-2 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                      {c.orgaoSigla}
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold" style={{ color: cor }}>
                  {c.taxaConversaoPct.toFixed(1)}% · {rotuloDaFaixa(faixa)}
                </span>
              </div>
              <div className="relative h-5 rounded" style={{ background: "var(--ds-color-background-muted)" }}>
                <div className="absolute left-0 top-0 h-full rounded-l" style={{ width: `${pctViews}%`, background: "var(--ds-color-border)" }} aria-hidden />
                <div className="absolute left-0 top-0 h-full rounded-l" style={{ width: `${pctCliques}%`, background: cor }} aria-hidden />
              </div>
              <div className="flex justify-between text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
                <span>{c.views.toLocaleString("pt-BR")} visitas</span>
                <span>{c.cliquesTotais.toLocaleString("pt-BR")} cliques</span>
              </div>
            </button>
            {estaAberta && <DetalheDestinos carta={c} />}
          </li>
        );
      })}
    </ul>
  );
}

function ListaResumida({ cartas }: { cartas: AcessoBotaoCarta[] }) {
  return (
    <ul className="flex flex-col gap-1 min-w-0">
      {cartas.map((c) => (
        <li key={c.slug} className="flex flex-wrap items-baseline justify-between gap-2 text-sm min-w-0 py-2 border-b" style={{ borderColor: "var(--ds-color-border)" }}>
          <a href={`${PORTAL_BASE}/${c.categoria ?? ""}/${c.slug}`} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" style={{ color: "var(--ds-color-primary-600)", flex: "1 1 220px" }}>
            {c.titulo} ↗
          </a>
          <span style={{ color: "var(--ds-color-text-secondary)" }}>
            {c.views.toLocaleString("pt-BR")} visitas · {c.cliquesTotais.toLocaleString("pt-BR")} cliques ·{" "}
            <strong style={{ color: corDaFaixa(faixaConversao(c.taxaConversaoPct)) }}>{c.taxaConversaoPct.toFixed(1)}%</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Destinos da carta expandida — vêm do próprio dataset estático (top-5 já
 *  agregado no pipeline). Não precisa fetch pra top-100. */
function DetalheDestinos({ carta }: { carta: AcessoBotaoCarta }) {
  return (
    <div className="pl-4 pb-4 pt-1">
      <p className="text-xs mb-2" style={{ color: "var(--ds-color-text-secondary)" }}>
        Destinos externos mais clicados a partir desta carta:
      </p>
      <ul className="flex flex-col gap-1 min-w-0">
        {carta.destinos.map((d) => (
          <li key={d.url} className="flex flex-wrap items-center justify-between gap-2 text-xs min-w-0">
            {d.url === "Outros destinos" ? (
              <span style={{ color: "var(--ds-color-text-muted)" }}>{d.url}</span>
            ) : (
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" style={{ color: "var(--ds-color-primary-600)", flex: "1 1 200px" }}>
                {d.url} ↗
              </a>
            )}
            <span style={{ color: "var(--ds-color-text-secondary)" }}>
              {d.cliques.toLocaleString("pt-BR")} · {d.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
