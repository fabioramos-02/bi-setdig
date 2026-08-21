"use client";

import { useMemo, useState } from "react";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import type { AcessoBotaoCarta } from "@/lib/data";
import {
  agregarPorOrgao,
  destinosPorHost,
  orgaosDisponiveis,
  totalCliques,
  type ResumoOrgao,
} from "@/lib/insights-acessos-botao";

const PORTAL_BASE = "https://www.ms.gov.br";

type EstadoFetch = "idle" | "carregando" | "sucesso" | "erro";

function hostDe(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Volume de cliques no botão "Acessar serviço" por carta.
 *  Fonte: Actions.getOutlinks?flat=1 (site-wide) cruzado com `urlExterno` do
 *  inventário. Sub-segundo — sem taxa de conversão (getOutlinks não traz
 *  pageviews, ver ADR). */
export function AcessarServicoTab({
  cartasSnapshot,
  visitasPorSlug,
  status,
  rotuloPeriodo,
  range,
  isPeriodoCorrente,
  totalCartasAtivas,
  totalOrgaos,
}: {
  cartasSnapshot: AcessoBotaoCarta[];
  visitasPorSlug: Map<string, number>;
  status: StatusIntervalo;
  rotuloPeriodo: string;
  range: { inicio: string; fim: string };
  isPeriodoCorrente: boolean;
  totalCartasAtivas: number;
  totalOrgaos: number;
}) {
  const [estado, setEstado] = useState<EstadoFetch>("idle");
  const [live, setLive] = useState<AcessoBotaoCarta[] | null>(null);
  const [liveRange, setLiveRange] = useState<{ inicio: string; fim: string } | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const liveEhDoRangeAtual = live !== null && liveRange?.inicio === range.inicio && liveRange?.fim === range.fim;
  const cartasFonte = liveEhDoRangeAtual ? live! : cartasSnapshot;
  const dadoLive = liveEhDoRangeAtual;

  const [orgaoAtivo, setOrgaoAtivo] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const orgaos = useMemo(() => orgaosDisponiveis(cartasFonte), [cartasFonte]);
  const cartas = useMemo(() => {
    let base = orgaoAtivo ? cartasFonte.filter((c) => c.orgaoSigla === orgaoAtivo) : cartasFonte;
    const termo = busca.trim().toLowerCase();
    if (termo) {
      base = base.filter(
        (c) =>
          c.titulo.toLowerCase().includes(termo) ||
          (c.orgaoSigla ?? "").toLowerCase().includes(termo) ||
          c.urlExterno.toLowerCase().includes(termo),
      );
    }
    return base;
  }, [cartasFonte, orgaoAtivo, busca]);
  const modoOrgao = orgaoAtivo && cartas.length > 0 ? orgaoAtivo : null;

  async function buscar() {
    setEstado("carregando");
    setErroMsg(null);
    try {
      const r = await fetch(`/api/analytics/cartas/acessos?inicio=${range.inicio}&fim=${range.fim}`);
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

  const total = useMemo(() => totalCliques(cartas), [cartas]);
  const destinos = useMemo(() => destinosPorHost(cartas, 5), [cartas]);
  const resumoOrgaos = useMemo(() => (orgaoAtivo ? [] : agregarPorOrgao(cartasFonte)), [cartasFonte, orgaoAtivo]);
  const top20 = useMemo(() => cartas.slice(0, 20), [cartas]);
  const semDado = cartas.length === 0;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {status === "fallback" && !dadoLive && (
        <AvisoSnapshotAproximado
          status={status}
          mensagemFallback={
            <>
              Período diferente do publicado. Números abaixo são do último snapshot — clique em{" "}
              <strong>Buscar dados do período</strong> pra atualizar ao vivo.
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
          totalCartasAtivas={totalCartasAtivas}
          totalOrgaos={totalOrgaos}
          buscaAtiva={busca.trim().length > 0}
          onLimparBusca={() => setBusca("")}
        />
      )}

      {erroMsg && (
        <div
          role="alert"
          className="text-base rounded"
          style={{ background: "var(--ds-color-danger-50, #fee2e2)", color: "var(--ds-color-danger, #991b1b)", padding: "var(--ds-spacing-12)", border: "1px solid var(--ds-color-danger, #dc2626)" }}
        >
          {erroMsg}
        </div>
      )}

      {estado === "carregando" ? (
        <SkeletonAba />
      ) : (
        <>
          {!semDado && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 min-w-0">
              <MetricCard label="Cliques no botão Acessar Serviço" value={total} sub={rotuloPeriodo} />
              <MetricCard label="Cartas com cliques" value={cartas.length} sub={modoOrgao ? `no órgão ${modoOrgao}` : "em todos os órgãos"} />
              <MetricCard
                label="Sistema externo líder"
                value={destinos[0]?.host ?? "—"}
                sub={destinos[0] ? `${destinos[0].cliques.toLocaleString("pt-BR")} cliques (${destinos[0].pct.toFixed(1)}%)` : ""}
              />
            </div>
          )}

          {destinos.length > 0 && (
            <DashboardSection title="Sistemas externos que mais recebem cidadãos do portal">
              <p className="mb-4 text-base font-medium" style={{ color: "var(--ds-color-text-secondary)" }}>
                Somando os cliques de todas as {cartas.length} cartas, os {destinos.length} sistemas externos abaixo recebem a maior parte do fluxo.
              </p>

              <div
                className="rounded mb-3"
                style={{
                  background: "var(--ds-color-primary-50, var(--ds-color-background-muted))",
                  border: "2px solid var(--ds-color-primary-600)",
                  padding: "var(--ds-spacing-24)",
                }}
              >
                <div
                  className="text-sm uppercase font-semibold tracking-wide mb-2"
                  style={{ color: "var(--ds-color-primary-600)" }}
                >
                  Sistema líder
                </div>
                <div
                  className="text-2xl font-bold truncate"
                  style={{ color: "var(--ds-color-text-primary)" }}
                >
                  {destinos[0].host}
                </div>
                <div
                  className="mt-1 text-base"
                  style={{ color: "var(--ds-color-text-secondary)" }}
                >
                  {destinos[0].cliques.toLocaleString("pt-BR")} cliques · {destinos[0].pct.toFixed(1)}% do total ·{" "}
                  {destinos[0].cartas} {destinos[0].cartas === 1 ? "carta" : "cartas"}
                </div>
              </div>

              {destinos.length > 1 && (
                <ul className="flex flex-col gap-2 min-w-0">
                  {destinos.slice(1).map((d) => (
                    <li
                      key={d.host}
                      className="flex flex-wrap items-center justify-between gap-2 min-w-0 text-base"
                    >
                      <span
                        className="truncate font-semibold"
                        style={{ flex: "1 1 200px", color: "var(--ds-color-text-primary)" }}
                      >
                        {d.host}
                        <span className="ml-2 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
                          ({d.cartas} {d.cartas === 1 ? "carta" : "cartas"})
                        </span>
                      </span>
                      <span style={{ color: "var(--ds-color-text-secondary)" }}>
                        {d.cliques.toLocaleString("pt-BR")} cliques · {d.pct.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>
          )}

          {top20.length > 0 && (
            <DashboardSection title="Cartas com mais cliques no botão Acessar Serviço">
              <p className="mb-3 text-base font-medium" style={{ color: "var(--ds-color-text-secondary)" }}>
                Quantas vezes o cidadão clicou em Acessar serviço em cada carta no período. Clique nos cabeçalhos pra reordenar.
              </p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label htmlFor="busca-carta" className="text-base font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
                  Buscar carta:
                </label>
                <input
                  id="busca-carta"
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="nome, sigla ou destino…"
                  className="text-base rounded"
                  style={{
                    padding: "var(--ds-spacing-8) var(--ds-spacing-12)",
                    border: "1px solid var(--ds-color-border)",
                    background: "var(--ds-color-background)",
                    color: "var(--ds-color-text-primary)",
                    minWidth: 240,
                    flex: "1 1 240px",
                  }}
                />
                {busca.trim() && (
                  <button
                    type="button"
                    onClick={() => setBusca("")}
                    className="text-sm underline"
                    style={{ color: "var(--ds-color-primary-600)", background: "transparent", border: 0, cursor: "pointer" }}
                  >
                    limpar busca
                  </button>
                )}
              </div>
              <TabelaVolume cartas={top20} visitasPorSlug={visitasPorSlug} />
            </DashboardSection>
          )}

          {resumoOrgaos.length > 0 && (
            <DashboardSection title="Volume por órgão">
              <p className="mb-3 text-base font-medium" style={{ color: "var(--ds-color-text-secondary)" }}>
                Cada linha resume o total de cliques nas cartas de um órgão. Clique numa linha pra filtrar toda a aba nele.
              </p>
              <TabelaOrgaos resumos={resumoOrgaos} onSelecionar={setOrgaoAtivo} />
            </DashboardSection>
          )}

          {semDado && (
            <EmptyCard message={orgaoAtivo ? `Nenhuma carta de ${orgaoAtivo} apareceu com cliques neste período.` : "Ainda sem dado de cliques neste período. Clique em Buscar dados do período pra consultar o Matomo agora."} />
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
      <div className="text-base min-w-0" style={{ color: "var(--ds-color-text-secondary)", flex: "1 1 260px" }}>
        {contexto}
      </div>
      <button
        type="button"
        onClick={onBuscar}
        disabled={carregando}
        className="text-base font-semibold rounded flex items-center gap-2"
        style={{
          background: carregando ? "var(--ds-color-border)" : "var(--ds-color-primary-600)",
          color: carregando ? "var(--ds-color-text-secondary)" : "var(--ds-color-background)",
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
      style={{ width: 14, height: 14, border: "2px solid var(--ds-color-border)", borderTopColor: "var(--ds-color-text-secondary)" }}
    />
  );
}

function brDia(d: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d;
}

function SkeletonAba() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" role="status" aria-label="Carregando dados do Matomo…">
      <div className="rounded" style={{ background: "var(--ds-color-background-muted)", height: 120 }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded" style={{ background: "var(--ds-color-background-muted)", height: 96 }} />
        ))}
      </div>
      <div className="rounded" style={{ background: "var(--ds-color-background-muted)", height: 320 }} />
      <p className="text-sm text-center" style={{ color: "var(--ds-color-text-secondary)" }}>
        Consultando o Matomo — sub-segundo em intervalos normais.
      </p>
    </div>
  );
}

function TabelaVolume({ cartas, visitasPorSlug }: { cartas: AcessoBotaoCarta[]; visitasPorSlug: Map<string, number> }) {
  const colunas: Coluna<AcessoBotaoCarta>[] = [
    {
      key: "carta",
      label: "Carta",
      sortable: true,
      sortValue: (c) => c.titulo,
      render: (c) => (
        <a
          href={`${PORTAL_BASE}/${c.categoria ?? ""}/${c.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline"
          style={{ color: "var(--ds-color-primary-600)" }}
        >
          {c.titulo} ↗
          {c.orgaoSigla && (
            <span className="ml-2 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
              {c.orgaoSigla}
            </span>
          )}
        </a>
      ),
    },
    {
      key: "acessos",
      label: "Acessos",
      align: "right",
      sortable: true,
      sortValue: (c) => visitasPorSlug.get(c.slug) ?? 0,
      render: (c) => {
        const v = visitasPorSlug.get(c.slug) ?? 0;
        return v > 0 ? (
          <span className="font-semibold text-base" style={{ color: "var(--ds-color-text-primary)" }}>
            {v.toLocaleString("pt-BR")}
          </span>
        ) : (
          <span style={{ color: "var(--ds-color-text-muted)" }}>—</span>
        );
      },
    },
    {
      key: "cliques",
      label: "Cliques em Acessar Serviço",
      align: "right",
      sortable: true,
      sortValue: (c) => c.cliques,
      render: (c) => (
        <span className="font-semibold text-base" style={{ color: "var(--ds-color-primary-600)" }}>
          {c.cliques.toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "destino",
      label: "Destino",
      sortable: true,
      sortValue: (c) => hostDe(c.urlExterno),
      render: (c) => (
        <a
          href={c.urlExterno}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-sm"
          style={{ color: "var(--ds-color-text-secondary)" }}
          title={c.urlExterno}
        >
          {hostDe(c.urlExterno)} ↗
        </a>
      ),
    },
  ];
  return <DataTable columns={colunas} rows={cartas} rowKey={(c) => c.slug} />;
}

function SeletorOrgao({
  orgaos,
  ativo,
  onChange,
  totalCartas,
  cartasFiltradas,
  totalCartasAtivas,
  totalOrgaos,
  buscaAtiva,
  onLimparBusca,
}: {
  orgaos: string[];
  ativo: string;
  onChange: (v: string) => void;
  totalCartas: number;
  cartasFiltradas: number;
  totalCartasAtivas: number;
  totalOrgaos: number;
  buscaAtiva: boolean;
  onLimparBusca: () => void;
}) {
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const filtrado = ativo || buscaAtiva;
  const infoCobertura = filtrado
    ? `Mostrando ${fmt(cartasFiltradas)} de ${fmt(totalCartas)} cartas com cliques`
    : `${fmt(totalCartas)} cartas com cliques (de ${fmt(totalCartasAtivas)} ativas) · ${orgaos.length} de ${totalOrgaos} órgãos`;
  return (
    <div
      className="flex flex-wrap items-center gap-3"
      style={{ padding: "var(--ds-spacing-12) var(--ds-spacing-16)", background: "var(--ds-color-background)", border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)" }}
    >
      <label htmlFor="filtro-orgao" className="text-base font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
        Órgão:
      </label>
      <select
        id="filtro-orgao"
        value={ativo}
        onChange={(e) => onChange(e.target.value)}
        className="text-base rounded"
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
      <span className="text-sm" style={{ color: "var(--ds-color-text-secondary)", flex: "1 1 auto" }}>
        {infoCobertura}
      </span>
      {filtrado && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onLimparBusca();
          }}
          className="text-sm underline"
          style={{ color: "var(--ds-color-primary-600)", background: "transparent", border: 0, cursor: "pointer" }}
        >
          limpar filtros
        </button>
      )}
    </div>
  );
}

function TabelaOrgaos({ resumos, onSelecionar }: { resumos: ResumoOrgao[]; onSelecionar: (sigla: string) => void }) {
  const colunas: Coluna<ResumoOrgao>[] = [
    {
      key: "orgao",
      label: "Órgão",
      sortable: true,
      sortValue: (r) => r.orgaoSigla,
      render: (r) => (
        <>
          <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>
            {r.orgaoSigla}
          </span>
          <span className="ml-2 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            {r.cartas} {r.cartas === 1 ? "carta" : "cartas"}
          </span>
        </>
      ),
    },
    {
      key: "cliques",
      label: "Cliques",
      align: "right",
      sortable: true,
      sortValue: (r) => r.cliques,
      render: (r) => (
        <span className="font-semibold text-base" style={{ color: "var(--ds-color-primary-600)" }}>
          {r.cliques.toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "lider",
      label: "Carta líder no órgão",
      sortable: true,
      sortValue: (r) => r.destinoPrincipal ?? "",
      render: (r) =>
        r.destinoPrincipal ? (
          <span className="text-sm" style={{ color: "var(--ds-color-text-primary)" }}>
            {r.destinoPrincipal}
            <span className="ml-1" style={{ color: "var(--ds-color-text-secondary)" }}>
              ({r.cliquesDestinoPrincipal.toLocaleString("pt-BR")} cliques)
            </span>
          </span>
        ) : (
          <span className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
            —
          </span>
        ),
    },
  ];
  return <DataTable columns={colunas} rows={resumos} rowKey={(r) => r.orgaoSigla} onRowClick={(r) => onSelecionar(r.orgaoSigla)} />;
}
