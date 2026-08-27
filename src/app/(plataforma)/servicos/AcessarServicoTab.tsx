"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import type { AcessoBotaoCarta, CartaRelacao } from "@/lib/data";
import { destinosPorHost } from "@/lib/insights-acessos-botao";

const PORTAL_BASE = "https://www.ms.gov.br";
const THRESHOLD_BULK_ORGAO = 15;

type EstadoBulk = "idle" | "carregando" | "sucesso" | "erro";
type DadoCliques = { cliques: number; compartilhado: boolean };

function hostDe(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Volume de cliques em "Acessar serviço" — sob demanda por órgão. Sem
 *  órgão selecionado: painel vazio. Órgão com ≤15 cartas com link externo:
 *  botão bulk (1 chamada Matomo). Órgão com >15: cada linha tem botão
 *  individual (1 chamada Matomo segmentada pela carta — resolve URL
 *  compartilhada). */
export function AcessarServicoTab({
  cartas,
  visitasPorSlug,
  rotuloPeriodo,
  range,
  totalCartasAtivas,
  totalOrgaos,
}: {
  cartas: CartaRelacao[];
  visitasPorSlug: Map<string, number>;
  rotuloPeriodo: string;
  range: { inicio: string; fim: string };
  totalCartasAtivas: number;
  totalOrgaos: number;
}) {
  const [orgaoAtivo, setOrgaoAtivo] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [cliquesPorSlug, setCliquesPorSlug] = useState<Map<string, DadoCliques>>(new Map());
  const [carregandoSlug, setCarregandoSlug] = useState<Set<string>>(new Set());
  const [estadoBulk, setEstadoBulk] = useState<EstadoBulk>("idle");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  // Cache de cliques é por período — trocou o range, cache antigo vira dado
  // errado no filtro novo. Reseta pra forçar nova busca sob demanda no período
  // atual (AGENTS.md: nada estático em domínio com filtro de período).
  useEffect(() => {
    setCliquesPorSlug(new Map());
    setCarregandoSlug(new Set());
    setEstadoBulk("idle");
    setErroMsg(null);
  }, [range.inicio, range.fim]);

  const orgaos = useMemo(() => [...new Set(cartas.map((c) => c.orgaoSigla))].sort(), [cartas]);

  const cartasDoOrgao = useMemo(
    () => (orgaoAtivo ? cartas.filter((c) => c.orgaoSigla === orgaoAtivo && c.urlExterno) : []),
    [cartas, orgaoAtivo],
  );

  const cartasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cartasDoOrgao;
    return cartasDoOrgao.filter(
      (c) =>
        c.titulo.toLowerCase().includes(termo) ||
        (c.urlExterno ?? "").toLowerCase().includes(termo),
    );
  }, [cartasDoOrgao, busca]);

  const modoBulk = orgaoAtivo && cartasDoOrgao.length > 0 && cartasDoOrgao.length <= THRESHOLD_BULK_ORGAO;
  const modoIndividual = orgaoAtivo && cartasDoOrgao.length > THRESHOLD_BULK_ORGAO;

  async function buscarBulkOrgao() {
    if (!orgaoAtivo) return;
    setEstadoBulk("carregando");
    setErroMsg(null);
    try {
      const r = await fetch(
        `/api/analytics/cartas/acessos?inicio=${range.inicio}&fim=${range.fim}&orgao=${encodeURIComponent(orgaoAtivo)}`,
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { cartas: AcessoBotaoCarta[] };
      setCliquesPorSlug((prev) => {
        const m = new Map(prev);
        for (const c of data.cartas ?? []) m.set(c.slug, { cliques: c.cliques, compartilhado: !!c.cliquesCompartilhado });
        return m;
      });
      setEstadoBulk("sucesso");
    } catch (exc) {
      console.error("[AcessarServicoTab] bulk-orgão falhou:", exc);
      setErroMsg("Não foi possível buscar os cliques do órgão. Tente novamente.");
      setEstadoBulk("erro");
    }
  }

  async function buscarSlugIndividual(slug: string) {
    if (carregandoSlug.has(slug)) return;
    setCarregandoSlug((prev) => new Set(prev).add(slug));
    setErroMsg(null);
    try {
      const r = await fetch(
        `/api/analytics/cartas/acessos?inicio=${range.inicio}&fim=${range.fim}&slug=${encodeURIComponent(slug)}`,
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { carta: AcessoBotaoCarta };
      setCliquesPorSlug((prev) => {
        const m = new Map(prev);
        m.set(slug, { cliques: data.carta.cliques, compartilhado: !!data.carta.cliquesCompartilhado });
        return m;
      });
    } catch (exc) {
      console.error(`[AcessarServicoTab] individual ${slug} falhou:`, exc);
      setErroMsg(`Não foi possível buscar os cliques da carta ${slug}.`);
    } finally {
      setCarregandoSlug((prev) => {
        const s = new Set(prev);
        s.delete(slug);
        return s;
      });
    }
  }

  // AcessoBotaoCarta[] derivado do que já foi buscado (pra reusar
  // destinosPorHost e cálculos). Cartas sem clique carregado ficam fora.
  const cartasCarregadas = useMemo<AcessoBotaoCarta[]>(() => {
    const out: AcessoBotaoCarta[] = [];
    for (const c of cartasDoOrgao) {
      const dado = cliquesPorSlug.get(c.slug);
      if (dado === undefined) continue;
      out.push({
        slug: c.slug,
        titulo: c.titulo,
        orgaoSigla: c.orgaoSigla ?? null,
        categoria: c.categoria ?? null,
        urlCarta: `${PORTAL_BASE}/${c.categoria ?? ""}/${c.slug}`,
        urlExterno: c.urlExterno ?? "",
        cliques: dado.cliques,
        cliquesCompartilhado: dado.compartilhado,
      });
    }
    return out.sort((a, b) => b.cliques - a.cliques);
  }, [cartasDoOrgao, cliquesPorSlug]);

  const totalCliques = cartasCarregadas.reduce((acc, c) => acc + c.cliques, 0);
  const destinos = useMemo(() => destinosPorHost(cartasCarregadas, 5), [cartasCarregadas]);
  const semOrgao = !orgaoAtivo;
  const semDadoAindaCarregado = orgaoAtivo && cartasCarregadas.length === 0;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <SeletorOrgao
        orgaos={orgaos}
        ativo={orgaoAtivo}
        onChange={(v) => {
          setOrgaoAtivo(v);
          setBusca("");
        }}
        totalCartas={cartasDoOrgao.length}
        cartasFiltradas={cartasFiltradas.length}
        totalCartasAtivas={totalCartasAtivas}
        totalOrgaos={totalOrgaos}
        buscaAtiva={busca.trim().length > 0}
        onLimparBusca={() => setBusca("")}
      />

      {semOrgao && (
        <EmptyCard message="Selecione um órgão para carregar os cliques em Acessar serviço das cartas dele." />
      )}

      {modoBulk && (
        <BarraBulkOrgao
          orgao={orgaoAtivo}
          quantidade={cartasDoOrgao.length}
          rotuloPeriodo={rotuloPeriodo}
          estado={estadoBulk}
          jaCarregado={cartasCarregadas.length > 0}
          onBuscar={buscarBulkOrgao}
        />
      )}

      {modoIndividual && (
        <div
          className="text-base rounded"
          style={{
            background: "var(--ds-color-background-muted)",
            padding: "var(--ds-spacing-16)",
            border: "1px solid var(--ds-color-border)",
            color: "var(--ds-color-text-secondary)",
          }}
        >
          O órgão <strong>{orgaoAtivo}</strong> tem {cartasDoOrgao.length} cartas com link externo — clique em <strong>Ver cliques</strong> em cada linha para carregar sob demanda.
        </div>
      )}

      {erroMsg && (
        <div
          role="alert"
          className="text-base rounded"
          style={{
            background: "var(--ds-color-danger-50, #fee2e2)",
            color: "var(--ds-color-danger, #991b1b)",
            padding: "var(--ds-spacing-12)",
            border: "1px solid var(--ds-color-danger, #dc2626)",
          }}
        >
          {erroMsg}
        </div>
      )}

      {cartasCarregadas.length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 min-w-0">
          <MetricCard label="Cliques no botão Acessar Serviço" value={totalCliques} sub={rotuloPeriodo} />
          <MetricCard
            label="Cartas com cliques"
            value={cartasCarregadas.filter((c) => c.cliques > 0).length}
            sub={`de ${cartasCarregadas.length} carregadas`}
          />
          <MetricCard
            label="Sistema externo líder"
            value={destinos[0]?.host ?? "—"}
            sub={destinos[0] ? `${destinos[0].cliques.toLocaleString("pt-BR")} cliques (${destinos[0].pct.toFixed(1)}%)` : ""}
          />
        </div>
      )}

      {destinos.length > 1 && (
        <DashboardSection title="Sistemas externos que mais recebem cidadãos do portal">
          <ul className="flex flex-col gap-2 min-w-0">
            {destinos.map((d, i) => (
              <li key={d.host} className="flex flex-wrap items-center justify-between gap-2 min-w-0 text-base">
                <span
                  className="truncate font-semibold"
                  style={{ flex: "1 1 200px", color: i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-primary)" }}
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
        </DashboardSection>
      )}

      {orgaoAtivo && cartasDoOrgao.length > 0 && (
        <DashboardSection title="Cartas do órgão">
          {semDadoAindaCarregado && !modoBulk && (
            <p className="mb-3 text-base" style={{ color: "var(--ds-color-text-secondary)" }}>
              Clique em <strong>Ver cliques</strong> em cada linha para carregar o valor da carta.
            </p>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label htmlFor="busca-carta" className="text-base font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
              Buscar carta:
            </label>
            <input
              id="busca-carta"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="nome ou destino…"
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
          <TabelaVolume
            cartas={cartasFiltradas}
            visitasPorSlug={visitasPorSlug}
            cliquesPorSlug={cliquesPorSlug}
            carregandoSlug={carregandoSlug}
            modoIndividual={Boolean(modoIndividual)}
            onBuscarSlug={buscarSlugIndividual}
          />
        </DashboardSection>
      )}
    </div>
  );
}

function TabelaVolume({
  cartas,
  visitasPorSlug,
  cliquesPorSlug,
  carregandoSlug,
  modoIndividual,
  onBuscarSlug,
}: {
  cartas: CartaRelacao[];
  visitasPorSlug: Map<string, number>;
  cliquesPorSlug: Map<string, DadoCliques>;
  carregandoSlug: Set<string>;
  modoIndividual: boolean;
  onBuscarSlug: (slug: string) => void;
}) {
  const colunas: Coluna<CartaRelacao>[] = [
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
      sortValue: (c) => cliquesPorSlug.get(c.slug)?.cliques ?? -1,
      render: (c) => (
        <CelulaCliques
          slug={c.slug}
          dado={cliquesPorSlug.get(c.slug)}
          carregando={carregandoSlug.has(c.slug)}
          modoIndividual={modoIndividual}
          onBuscar={() => onBuscarSlug(c.slug)}
        />
      ),
    },
    {
      key: "destino",
      label: "Destino",
      sortable: true,
      sortValue: (c) => hostDe(c.urlExterno ?? ""),
      render: (c) =>
        c.urlExterno ? (
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
        ) : (
          <span style={{ color: "var(--ds-color-text-muted)" }}>—</span>
        ),
    },
  ];
  return <DataTable columns={colunas} rows={cartas} rowKey={(c) => c.slug} />;
}

function CelulaCliques({
  slug,
  dado,
  carregando,
  modoIndividual,
  onBuscar,
}: {
  slug: string;
  dado: DadoCliques | undefined;
  carregando: boolean;
  modoIndividual: boolean;
  onBuscar: () => void;
}) {
  if (carregando) return <Spinner />;
  if (dado !== undefined) {
    return dado.cliques > 0 ? (
      <span className="font-semibold text-base" style={{ color: "var(--ds-color-primary-600)" }}>
        {dado.cliques.toLocaleString("pt-BR")}
        {dado.compartilhado && (
          <span
            className="ml-1 text-xs align-middle"
            style={{ color: "var(--ds-color-warning, #b45309)" }}
            title="Este destino é usado por várias cartas — o valor mostrado é o total do destino, não só desta carta."
            aria-label="Cliques compartilhados entre várias cartas com o mesmo destino"
          >
            ⚠
          </span>
        )}
      </span>
    ) : (
      <span style={{ color: "var(--ds-color-text-muted)" }}>0</span>
    );
  }
  if (!modoIndividual) return <span style={{ color: "var(--ds-color-text-muted)" }}>—</span>;
  return (
    <button
      type="button"
      onClick={onBuscar}
      aria-label={`Ver cliques da carta ${slug}`}
      className="text-xs underline"
      style={{ color: "var(--ds-color-primary-600)", background: "transparent", border: 0, cursor: "pointer" }}
    >
      Ver cliques
    </button>
  );
}

function BarraBulkOrgao({
  orgao,
  quantidade,
  rotuloPeriodo,
  estado,
  jaCarregado,
  onBuscar,
}: {
  orgao: string;
  quantidade: number;
  rotuloPeriodo: string;
  estado: EstadoBulk;
  jaCarregado: boolean;
  onBuscar: () => void;
}) {
  const carregando = estado === "carregando";
  const rotulo = jaCarregado ? "Atualizar cliques" : "Buscar cliques deste órgão";
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded"
      style={{
        background: "var(--ds-color-background-muted)",
        padding: "var(--ds-spacing-16)",
        border: "1px solid var(--ds-color-border)",
      }}
    >
      <div className="text-base min-w-0" style={{ color: "var(--ds-color-text-secondary)", flex: "1 1 260px" }}>
        Órgão <strong>{orgao}</strong> tem {quantidade} carta{quantidade === 1 ? "" : "s"} com link externo. 1 chamada carrega todas em segundos, {rotuloPeriodo}.
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
  const infoCobertura = ativo
    ? buscaAtiva
      ? `Mostrando ${fmt(cartasFiltradas)} de ${fmt(totalCartas)} cartas do órgão`
      : `${fmt(totalCartas)} carta${totalCartas === 1 ? "" : "s"} do órgão com link externo`
    : `${fmt(totalCartasAtivas)} cartas ativas em ${totalOrgaos} órgãos — selecione um`;
  return (
    <div
      className="flex flex-wrap items-center gap-3"
      style={{
        padding: "var(--ds-spacing-12) var(--ds-spacing-16)",
        background: "var(--ds-color-background)",
        border: "1px solid var(--ds-color-border)",
        borderRadius: "var(--ds-radius-md)",
      }}
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
        <option value="">Selecione um órgão…</option>
        {orgaos.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="text-sm" style={{ color: "var(--ds-color-text-secondary)", flex: "1 1 auto" }}>
        {infoCobertura}
      </span>
      {(ativo || buscaAtiva) && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onLimparBusca();
          }}
          className="text-sm underline"
          style={{ color: "var(--ds-color-primary-600)", background: "transparent", border: 0, cursor: "pointer" }}
        >
          limpar
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block animate-spin rounded-full"
      style={{
        width: 14,
        height: 14,
        border: "2px solid var(--ds-color-border)",
        borderTopColor: "var(--ds-color-text-secondary)",
      }}
    />
  );
}
