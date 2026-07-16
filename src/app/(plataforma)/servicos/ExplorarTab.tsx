"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { Select } from "@/components/dashboard/Select";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import { labelCategoria, prazoServico } from "@/lib/servicos";
import type { CartaRelacao } from "@/lib/data";

const PASSO = 50;
const PORTAL_BASE = "https://www.ms.gov.br";
const TODOS = "";

const prazoDe = (c: CartaRelacao) => prazoServico(c.tempoTotal, c.tipoTempo);

/** Tabela operacional das cartas ativas — Nome/Órgão/Categoria/Prazo/Acessos +
 * link pro portal. Ordena pela procura (acessos no período) por padrão, com
 * ordenação por coluna disponível. Busca livre + filtro por Órgão/Categoria/
 * Público-alvo (combinam em AND) + paginação (a lista é grande, ~1200 cartas
 * ativas). */
export function ExplorarTab({
  cartas,
  visitasPorSlug,
  status,
  rotuloPeriodo,
}: {
  cartas: CartaRelacao[];
  visitasPorSlug: Map<string, number>;
  status: StatusIntervalo;
  rotuloPeriodo: string;
}) {
  const [busca, setBusca] = useState("");
  const [orgaoFiltro, setOrgaoFiltro] = useState(TODOS);
  const [categoriaFiltro, setCategoriaFiltro] = useState(TODOS);
  const [publicoFiltro, setPublicoFiltro] = useState(TODOS);
  const [visiveis, setVisiveis] = useState(PASSO);

  const orgaos = useMemo(() => [...new Set(cartas.map((c) => c.orgaoSigla))].sort(), [cartas]);
  const categorias = useMemo(
    () => [...new Set(cartas.map((c) => c.categoria).filter((c): c is string => Boolean(c)))].sort(),
    [cartas],
  );
  // `publico` é texto livre em HTML (regra de elegibilidade completa, quase
  // único por carta) — não serve de filtro. `publicoEspecifico` é a
  // taxonomia limpa (Cidadão/Empresa/Gestão Pública/Servidor), e pode ter
  // mais de um valor por carta.
  const publicos = useMemo(() => [...new Set(cartas.flatMap((c) => c.publicoEspecifico))].sort(), [cartas]);

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
    {
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
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AvisoSnapshotAproximado
        status={status}
        mensagemFallback="Não foi possível buscar os acessos desse período agora — tenta um período menor ou tenta de novo em instantes."
      />
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

          <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            {ordenadas.length.toLocaleString("pt-BR")} carta{ordenadas.length === 1 ? "" : "s"} ativa
            {ordenadas.length === 1 ? "" : "s"} · ordenadas pela procura {rotuloPeriodo} · mostrando {mostrando.length.toLocaleString("pt-BR")}
          </p>

          <div className="overflow-x-auto">
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
