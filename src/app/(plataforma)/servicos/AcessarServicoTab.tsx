"use client";

import { useMemo, useState } from "react";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import type { AcessoBotaoCarta } from "@/lib/data";
import {
  agregarPorOrgao,
  cartasComAltaConversao,
  cartasComBaixaConversao,
  corDaFaixa,
  destinosAgregados,
  faixaConversao,
  fraseAncoraAcessos,
  orgaosDisponiveis,
  rotuloDaFaixa,
  taxaMediaPonderada,
  type ResumoOrgao,
} from "@/lib/insights-acessos-botao";

const PORTAL_BASE = "https://www.ms.gov.br";

type EstadoFetch = "idle" | "carregando" | "sucesso" | "erro";

/** Cliques em "Acessar serviço" por carta. 3 fontes de dado, em ordem de preferência:
 *  1. Snapshot estático publicado (top-100 × 4 períodos fixos) — default do período corrente.
 *  2. Fetch live via /api/analytics/cartas/acessos — quando o usuário clica
 *     "Buscar dados do período" (essencial pra ano histórico e granularidades
 *     passadas — o snapshot só cobre o corrente).
 *  3. Estado vazio honesto quando não há dado nenhum.
 *  Todo cálculo em insights-acessos-botao.ts (AGENTS.md::convencoes). */
export function AcessarServicoTab({
  cartasSnapshot,
  status,
  rotuloPeriodo,
  range,
  isPeriodoCorrente,
}: {
  cartasSnapshot: AcessoBotaoCarta[];
  status: StatusIntervalo;
  rotuloPeriodo: string;
  range: { inicio: string; fim: string };
  isPeriodoCorrente: boolean;
}) {
  const [estado, setEstado] = useState<EstadoFetch>("idle");
  const [live, setLive] = useState<AcessoBotaoCarta[] | null>(null);
  const [liveRange, setLiveRange] = useState<{ inicio: string; fim: string } | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const liveEhDoRangeAtual = live !== null && liveRange?.inicio === range.inicio && liveRange?.fim === range.fim;
  // Prioridade: live do range atual (recém-carregado) > snapshot estático.
  const cartasFonte = liveEhDoRangeAtual ? live! : cartasSnapshot;
  const dadoLive = liveEhDoRangeAtual;

  const [orgaoAtivo, setOrgaoAtivo] = useState<string>("");
  const orgaos = useMemo(() => orgaosDisponiveis(cartasFonte), [cartasFonte]);
  // Filtro reset silencioso se o órgão selecionado sumir do dataset atual
  // (mudou de período, veio um live com órgãos diferentes) — evita "vazio
  // fantasma" onde o Tab fica em branco porque o filtro ficou preso.
  const cartas = useMemo(
    () => (orgaoAtivo ? cartasFonte.filter((c) => c.orgaoSigla === orgaoAtivo) : cartasFonte),
    [cartasFonte, orgaoAtivo],
  );
  const modoOrgao = orgaoAtivo && cartas.length > 0 ? orgaoAtivo : null;

  async function buscar() {
    setEstado("carregando");
    setErroMsg(null);
    try {
      const r = await fetch(`/api/analytics/cartas/acessos?inicio=${range.inicio}&fim=${range.fim}&top=30`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { cartas: AcessoBotaoCarta[] };
      setLive(data.cartas ?? []);
      setLiveRange({ inicio: range.inicio, fim: range.fim });
      setEstado("sucesso");
    } catch (exc) {
      console.error("[AcessarServicoTab] fetch falhou:", exc);
      setErroMsg("Não foi possível buscar os dados do período agora. Tente de novo em instantes.");
      setEstado("erro");
    }
  }

  const frase = useMemo(() => fraseAncoraAcessos(cartas, modoOrgao), [cartas, modoOrgao]);
  const resumoOrgaos = useMemo(() => (orgaoAtivo ? [] : agregarPorOrgao(cartasFonte)), [cartasFonte, orgaoAtivo]);
  const taxaMedia = useMemo(() => taxaMediaPonderada(cartas), [cartas]);
  const totalCliques = useMemo(() => cartas.reduce((a, c) => a + c.cliquesTotais, 0), [cartas]);
  const baixa = useMemo(() => cartasComBaixaConversao(cartas, 100), [cartas]);
  const alta = useMemo(() => cartasComAltaConversao(cartas, 20), [cartas]);
  const destinos = useMemo(() => destinosAgregados(cartas, 5), [cartas]);
  const top20 = useMemo(() => [...cartas].sort((a, b) => b.cliquesTotais - a.cliquesTotais).slice(0, 20), [cartas]);

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {status === "fallback" && !dadoLive && (
        <AvisoSnapshotAproximado
          status={status}
          mensagemFallback={
            <>
              Você selecionou um período diferente do atual. Os números abaixo ainda são do último período publicado —
              clique em <strong>Buscar dados do período</strong> pra atualizar com o intervalo escolhido.
            </>
          }
        />
      )}

      <BarraDeAcao
        rotuloPeriodo={rotuloPeriodo}
        range={range}
        estado={estado}
        dadoLive={dadoLive}
        isPeriodoCorrente={isPeriodoCorrente}
        onBuscar={buscar}
      />

      {orgaos.length > 0 && (
        <SeletorOrgao
          orgaos={orgaos}
          ativo={orgaoAtivo}
          onChange={setOrgaoAtivo}
          totalCartas={cartasFonte.length}
          cartasFiltradas={cartas.length}
        />
      )}

      {erroMsg && (
        <div
          role="alert"
          className="text-sm rounded"
          style={{ background: "var(--ds-color-danger-50, #fee2e2)", color: "var(--ds-color-danger, #991b1b)", padding: "var(--ds-spacing-12)", border: "1px solid var(--ds-color-danger, #dc2626)" }}
        >
          {erroMsg}
        </div>
      )}

      {estado === "carregando" ? (
        <SkeletonAba />
      ) : (
        <>
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

          {resumoOrgaos.length > 0 && (
            <DashboardSection title="Redirecionamento por órgão">
              <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
                Cada linha resume o desempenho das cartas de um órgão — quantas visitas somaram, quantos cidadãos clicaram em Acessar serviço e pra qual sistema externo esse órgão mais manda. Clique num órgão pra filtrar toda a aba nele.
              </p>
              <TabelaOrgaos resumos={resumoOrgaos} onSelecionar={setOrgaoAtivo} />
            </DashboardSection>
          )}

          {frase.semDado && (
            <EmptyCard message={orgaoAtivo ? `Nenhuma carta de ${orgaoAtivo} apareceu com cliques neste período. Tente outro órgão ou volte pra visão geral.` : "Ainda sem dado de cliques neste período. Clique em Buscar dados do período pra consultar o Matomo agora — ou selecione um período com movimento."} />
          )}
        </>
      )}
    </div>
  );
}

function BarraDeAcao({
  rotuloPeriodo,
  range,
  estado,
  dadoLive,
  isPeriodoCorrente,
  onBuscar,
}: {
  rotuloPeriodo: string;
  range: { inicio: string; fim: string };
  estado: EstadoFetch;
  dadoLive: boolean;
  isPeriodoCorrente: boolean;
  onBuscar: () => void;
}) {
  const carregando = estado === "carregando";
  const rotulo = dadoLive
    ? "Atualizar dados do período"
    : isPeriodoCorrente
    ? "Rebuscar do período atual"
    : "Buscar dados do período";
  const contexto = dadoLive
    ? `Mostrando dados ao vivo do período ${rotuloPeriodo} (${brDia(range.inicio)} a ${brDia(range.fim)}).`
    : isPeriodoCorrente
    ? `Mostrando o último snapshot publicado (${rotuloPeriodo}).`
    : `Snapshot desatualizado — o período selecionado (${rotuloPeriodo}) precisa de busca ao vivo.`;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded"
      style={{ background: "var(--ds-color-background-muted)", padding: "var(--ds-spacing-16)", border: "1px solid var(--ds-color-border)" }}
    >
      <div className="text-sm min-w-0" style={{ color: "var(--ds-color-text-secondary)", flex: "1 1 260px" }}>
        {contexto}
      </div>
      <button
        type="button"
        onClick={onBuscar}
        disabled={carregando}
        className="text-sm font-semibold rounded flex items-center gap-2"
        style={{
          background: carregando ? "var(--ds-color-border)" : "var(--ds-color-primary-600)",
          color: carregando ? "var(--ds-color-text-muted)" : "var(--ds-color-background)",
          padding: "var(--ds-spacing-8) var(--ds-spacing-16)",
          cursor: carregando ? "wait" : "pointer",
          border: 0,
        }}
        aria-live="polite"
      >
        {carregando && <Spinner />}
        {carregando ? "Buscando no Matomo…" : rotulo}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="animate-spin rounded-full"
      style={{ width: 14, height: 14, border: "2px solid var(--ds-color-border)", borderTopColor: "var(--ds-color-text-muted)" }}
    />
  );
}

function brDia(d: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d;
}

function SkeletonAba() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" role="status" aria-label="Carregando dados do Matomo — pode levar até 1 minuto.">
      <div className="rounded" style={{ background: "var(--ds-color-background-muted)", height: 120 }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded" style={{ background: "var(--ds-color-background-muted)", height: 96 }} />
        ))}
      </div>
      <div className="rounded" style={{ background: "var(--ds-color-background-muted)", height: 320 }} />
      <p className="text-xs text-center" style={{ color: "var(--ds-color-text-muted)" }}>
        Consultando o Matomo carta por carta — em intervalos grandes (ex.: ano inteiro) pode levar até 1 minuto.
      </p>
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

function SeletorOrgao({
  orgaos,
  ativo,
  onChange,
  totalCartas,
  cartasFiltradas,
}: {
  orgaos: string[];
  ativo: string;
  onChange: (v: string) => void;
  totalCartas: number;
  cartasFiltradas: number;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-3"
      style={{ padding: "var(--ds-spacing-12) var(--ds-spacing-16)", background: "var(--ds-color-background)", border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)" }}
    >
      <label htmlFor="filtro-orgao" className="text-sm font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
        Órgão responsável:
      </label>
      <select
        id="filtro-orgao"
        value={ativo}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm rounded"
        style={{
          padding: "var(--ds-spacing-8) var(--ds-spacing-12)",
          border: "1px solid var(--ds-color-border)",
          background: "var(--ds-color-background)",
          color: "var(--ds-color-text-primary)",
        }}
      >
        <option value="">Todos os órgãos</option>
        {orgaos.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>
        {ativo ? `Mostrando ${cartasFiltradas} de ${totalCartas} cartas` : `${totalCartas} cartas no período`}
      </span>
      {ativo && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs underline"
          style={{ color: "var(--ds-color-primary-600)", background: "transparent", border: 0, cursor: "pointer" }}
        >
          limpar filtro
        </button>
      )}
    </div>
  );
}

function TabelaOrgaos({ resumos, onSelecionar }: { resumos: ResumoOrgao[]; onSelecionar: (sigla: string) => void }) {
  const maxCliques = Math.max(...resumos.map((r) => r.cliques), 1);
  return (
    <ul className="flex flex-col gap-1 min-w-0">
      {resumos.map((r) => {
        const faixa = faixaConversao(r.taxaMediaPct);
        const cor = corDaFaixa(faixa);
        const pct = (r.cliques / maxCliques) * 100;
        return (
          <li key={r.orgaoSigla} className="min-w-0 border-b" style={{ borderColor: "var(--ds-color-border)" }}>
            <button
              type="button"
              onClick={() => onSelecionar(r.orgaoSigla)}
              className="w-full text-left py-3 flex flex-col gap-1 min-w-0"
              style={{ color: "var(--ds-color-text-primary)" }}
              title={`Filtrar aba nas cartas do ${r.orgaoSigla}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 min-w-0">
                <span className="font-medium truncate" style={{ flex: "1 1 220px" }}>
                  {r.orgaoSigla}
                  <span className="ml-2 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                    {r.cartas} {r.cartas === 1 ? "carta" : "cartas"}
                  </span>
                </span>
                <span className="text-sm font-semibold" style={{ color: cor }}>
                  {r.taxaMediaPct.toFixed(1)}% · {rotuloDaFaixa(faixa)}
                </span>
              </div>
              <div className="relative h-3 rounded" style={{ background: "var(--ds-color-background-muted)" }}>
                <div className="absolute left-0 top-0 h-full rounded" style={{ width: `${pct}%`, background: cor }} aria-hidden />
              </div>
              <div className="flex flex-wrap justify-between text-xs gap-2" style={{ color: "var(--ds-color-text-secondary)" }}>
                <span>
                  {r.views.toLocaleString("pt-BR")} visitas · {r.cliques.toLocaleString("pt-BR")} cliques
                </span>
                {r.destinoPrincipal && (
                  <span className="truncate" style={{ maxWidth: "60%" }}>
                    principal destino: <span style={{ color: "var(--ds-color-text-primary)" }}>{r.destinoPrincipal}</span>
                    {" "}({r.cliquesDestinoPrincipal.toLocaleString("pt-BR")})
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
