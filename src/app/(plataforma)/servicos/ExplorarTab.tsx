"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { Select } from "@/components/dashboard/Select";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { labelCategoria, prazoServico } from "@/lib/servicos";
import type { AcessoBotaoCarta, CartaRelacao } from "@/lib/data";

const PASSO = 50;
const PORTAL_BASE = "https://www.ms.gov.br";
const TODOS = "";
// Limite entre "1 chamada Matomo pro órgão inteiro" (bulk, viável quando são
// poucas cartas) e "1 chamada por carta na hora que o usuário clica"
// (individual — evita chamada gigante em órgãos grandes).
const THRESHOLD_BULK_ORGAO = 15;

const prazoDe = (c: CartaRelacao) => prazoServico(c.tempoTotal, c.tipoTempo);

type EstadoBulk = "idle" | "carregando" | "sucesso" | "erro";
type DadoCliques = { cliques: number; compartilhado: boolean };

/** Tabela operacional das cartas ativas — Nome/Órgão/Categoria/Prazo/Acessos +
 * link pro portal. Coluna "Acessar Serviço" só aparece quando o usuário
 * filtra por órgão: se o órgão tem ≤15 cartas, uma barra "Buscar cliques
 * deste órgão" carrega tudo em 1 chamada; se tem >15, cada linha ganha
 * botão individual "Ver cliques" que faz 1 chamada Matomo segmentada
 * pela carta (precisa em URL compartilhada). */
export function ExplorarTab({
  cartas,
  visitasPorSlug,
  range,
  status,
  rotuloPeriodo,
}: {
  cartas: CartaRelacao[];
  visitasPorSlug: Map<string, number>;
  range: { inicio: string; fim: string };
  status: StatusIntervalo;
  rotuloPeriodo: string;
}) {
  const [busca, setBusca] = useState("");
  const [orgaoFiltro, setOrgaoFiltro] = useState(TODOS);
  const [categoriaFiltro, setCategoriaFiltro] = useState(TODOS);
  const [publicoFiltro, setPublicoFiltro] = useState(TODOS);
  const [visiveis, setVisiveis] = useState(PASSO);

  // Cliques em "Acessar serviço" — populado incrementalmente pelas chamadas
  // ao vivo. Chave = slug. Ausente = ainda não buscado; 0 = buscado e sem
  // clique no período (diferença importante pra UX).
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
  const categorias = useMemo(
    () => [...new Set(cartas.map((c) => c.categoria).filter((c): c is string => Boolean(c)))].sort(),
    [cartas],
  );
  const publicos = useMemo(() => [...new Set(cartas.flatMap((c) => c.publicoEspecifico))].sort(), [cartas]);

  const cartasDoOrgao = useMemo(
    () => (orgaoFiltro ? cartas.filter((c) => c.orgaoSigla === orgaoFiltro) : []),
    [cartas, orgaoFiltro],
  );
  const cartasDoOrgaoComUrl = useMemo(
    () => cartasDoOrgao.filter((c) => c.urlExterno),
    [cartasDoOrgao],
  );
  const modoBulk = orgaoFiltro && cartasDoOrgaoComUrl.length > 0 && cartasDoOrgaoComUrl.length <= THRESHOLD_BULK_ORGAO;
  const modoIndividual = orgaoFiltro && cartasDoOrgaoComUrl.length > THRESHOLD_BULK_ORGAO;

  async function buscarBulkOrgao() {
    if (!orgaoFiltro) return;
    setEstadoBulk("carregando");
    setErroMsg(null);
    try {
      const r = await fetch(
        `/api/analytics/cartas/acessos?inicio=${range.inicio}&fim=${range.fim}&orgao=${encodeURIComponent(orgaoFiltro)}`,
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
      console.error("[ExplorarTab] bulk-orgão falhou:", exc);
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
      console.error(`[ExplorarTab] individual ${slug} falhou:`, exc);
      setErroMsg(`Não foi possível buscar os cliques da carta ${slug}.`);
    } finally {
      setCarregandoSlug((prev) => {
        const s = new Set(prev);
        s.delete(slug);
        return s;
      });
    }
  }

  const resetarPagina = () => setVisiveis(PASSO);

  const ordenadas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtradas = cartas.filter((c) => {
      if (orgaoFiltro && c.orgaoSigla !== orgaoFiltro) return false;
      if (categoriaFiltro && c.categoria !== categoriaFiltro) return false;
      if (publicoFiltro && !c.publicoEspecifico.includes(publicoFiltro)) return false;
      if (!termo) return true;
      return (
        c.titulo.toLowerCase().includes(termo) ||
        c.nomePopular?.toLowerCase().includes(termo) ||
        c.orgaoSigla.toLowerCase().includes(termo)
      );
    });
    return [...filtradas].sort((a, b) => (visitasPorSlug.get(b.slug) ?? 0) - (visitasPorSlug.get(a.slug) ?? 0));
  }, [cartas, busca, orgaoFiltro, categoriaFiltro, publicoFiltro, visitasPorSlug]);

  const mostrando = ordenadas.slice(0, visiveis);

  if (cartas.length === 0) {
    return <EmptyCard message="Nenhuma carta ativa cadastrada." />;
  }

  const colunas: Coluna<CartaRelacao>[] = [
    {
      key: "servico",
      label: "Serviço",
      sortable: true,
      sortValue: (c) => c.titulo,
      render: (c) => (
        <>
          <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>
            {c.titulo}
          </span>
          {c.nomePopular && (
            <div className="text-xs truncate" style={{ color: "var(--ds-color-text-muted)" }}>
              {c.nomePopular}
            </div>
          )}
        </>
      ),
    },
    {
      key: "orgao",
      label: "Órgão",
      sortable: true,
      sortValue: (c) => c.orgaoSigla,
      render: (c) => <span style={{ color: "var(--ds-color-text-secondary)" }}>{c.orgaoSigla}</span>,
    },
    {
      key: "categoria",
      label: "Categoria",
      sortable: true,
      sortValue: (c) => labelCategoria(c.categoria),
      render: (c) => <span style={{ color: "var(--ds-color-text-secondary)" }}>{labelCategoria(c.categoria)}</span>,
    },
    {
      key: "prazo",
      label: "Prazo",
      render: (c) => <span className="text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>{prazoDe(c)}</span>,
    },
    {
      key: "acessos",
      label: "Acessos",
      align: "right",
      sortable: true,
      sortValue: (c) => visitasPorSlug.get(c.slug) ?? 0,
      render: (c) => (
        <span className="font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
          {(visitasPorSlug.get(c.slug) ?? 0).toLocaleString("pt-BR")}
        </span>
      ),
    },
  ];

  if (orgaoFiltro && cartasDoOrgaoComUrl.length > 0) {
    colunas.push({
      key: "cliques-botao",
      label: "Acessar Serviço",
      align: "right",
      sortable: true,
      sortValue: (c) => cliquesPorSlug.get(c.slug)?.cliques ?? -1,
      render: (c) => (
        <CelulaCliques
          slug={c.slug}
          temUrlExterno={Boolean(c.urlExterno)}
          dado={cliquesPorSlug.get(c.slug)}
          carregando={carregandoSlug.has(c.slug)}
          modoIndividual={Boolean(modoIndividual)}
          onBuscar={() => buscarSlugIndividual(c.slug)}
        />
      ),
    });
  }

  colunas.push({
    key: "portal",
    label: "Portal",
    align: "right",
    render: (c) => (
      <a
        href={`${PORTAL_BASE}/${c.categoria}/${c.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline text-xs"
        style={{ color: "var(--ds-color-primary-600)" }}
      >
        Abrir ↗
      </a>
    ),
  });

  return (
    <div className="flex flex-col gap-4">
      <AvisoSnapshotAproximado
        status={status}
        mensagemFallback="Não foi possível buscar os acessos desse período agora — tenta um período menor ou tenta de novo em instantes."
      />

      {!orgaoFiltro && (
        <div
          className="text-base rounded"
          style={{
            background: "var(--ds-color-background-muted)",
            padding: "var(--ds-spacing-16)",
            border: "1px solid var(--ds-color-border)",
            color: "var(--ds-color-text-secondary)",
          }}
        >
          Filtre por órgão para carregar os cliques em <strong>Acessar serviço</strong> de cada carta.
        </div>
      )}

      {modoBulk && (
        <BarraBulkOrgao
          orgao={orgaoFiltro}
          quantidade={cartasDoOrgaoComUrl.length}
          rotuloPeriodo={rotuloPeriodo}
          estado={estadoBulk}
          jaCarregado={cartasDoOrgaoComUrl.some((c) => cliquesPorSlug.has(c.slug))}
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
          O órgão <strong>{orgaoFiltro}</strong> tem {cartasDoOrgaoComUrl.length} cartas com link externo — clique em <strong>Ver cliques</strong> em cada linha para carregar sob demanda.
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

      <DashboardSection
        title="Explorar cartas de serviço"
        action={
          <ExportCsvButton
            rows={ordenadas.map((c) => ({
              Serviço: c.titulo,
              Órgão: c.orgaoSigla,
              Categoria: labelCategoria(c.categoria),
              Prazo: prazoDe(c),
              Custo: c.custo ?? "",
              [`Acessos ${rotuloPeriodo}`]: visitasPorSlug.get(c.slug) ?? 0,
              [`Cliques Acessar Serviço ${rotuloPeriodo}`]: cliquesPorSlug.get(c.slug)?.cliques ?? "",
              Link: `${PORTAL_BASE}/${c.categoria}/${c.slug}`,
            }))}
            filename="cartas-servico"
          />
        }
      >
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              resetarPagina();
            }}
            placeholder="Buscar por serviço, nome popular ou órgão…"
            className="w-full text-sm rounded-md py-2.5 px-3 outline-none"
            style={{ border: "1px solid var(--ds-color-border)", background: "var(--ds-color-background)", color: "var(--ds-color-text-primary)" }}
          />

          <div className="flex flex-wrap gap-3">
            <Select
              label="Órgão"
              todosLabel="Todos os órgãos"
              value={orgaoFiltro}
              onChange={(v) => {
                setOrgaoFiltro(v);
                resetarPagina();
              }}
              opcoes={orgaos.map((o) => ({ value: o, label: o }))}
            />
            <Select
              label="Categoria"
              todosLabel="Todas as categorias"
              value={categoriaFiltro}
              onChange={(v) => {
                setCategoriaFiltro(v);
                resetarPagina();
              }}
              opcoes={categorias.map((c) => ({ value: c, label: labelCategoria(c) }))}
            />
            <Select
              label="Público-alvo"
              todosLabel="Todos os públicos"
              value={publicoFiltro}
              onChange={(v) => {
                setPublicoFiltro(v);
                resetarPagina();
              }}
              opcoes={publicos.map((p) => ({ value: p, label: p }))}
            />
          </div>

          <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
            {ordenadas.length.toLocaleString("pt-BR")} carta{ordenadas.length === 1 ? "" : "s"} ativa
            {ordenadas.length === 1 ? "" : "s"} · ordenadas pela procura {rotuloPeriodo} · mostrando {mostrando.length.toLocaleString("pt-BR")}
          </p>

          <div className="overflow-x-auto print:overflow-visible">
            <ChartLoading status={status} height={400}>
              <DataTable columns={colunas} rows={mostrando} rowKey={(c) => c.slug} />
            </ChartLoading>
          </div>

          {visiveis < ordenadas.length && (
            <button
              type="button"
              onClick={() => setVisiveis((v) => v + PASSO)}
              className="self-center text-sm font-medium rounded-md px-4 py-2"
              style={{ color: "var(--ds-color-primary-600)", border: "1px solid var(--ds-color-border)" }}
            >
              Carregar mais ({(ordenadas.length - visiveis).toLocaleString("pt-BR")} restantes)
            </button>
          )}
        </div>
      </DashboardSection>
    </div>
  );
}

function CelulaCliques({
  slug,
  temUrlExterno,
  dado,
  carregando,
  modoIndividual,
  onBuscar,
}: {
  slug: string;
  temUrlExterno: boolean;
  dado: DadoCliques | undefined;
  carregando: boolean;
  modoIndividual: boolean;
  onBuscar: () => void;
}) {
  if (!temUrlExterno) return <span style={{ color: "var(--ds-color-text-muted)" }}>—</span>;
  if (carregando) return <Spinner />;
  if (dado !== undefined) {
    return dado.cliques > 0 ? (
      <span className="font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
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
