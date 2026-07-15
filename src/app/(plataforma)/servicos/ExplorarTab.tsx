"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { labelCategoria, prazoServico } from "@/lib/servicos";
import type { CartaRelacao } from "@/lib/data";

const PASSO = 50;
const PORTAL_BASE = "https://www.ms.gov.br";

const prazoDe = (c: CartaRelacao) => prazoServico(c.tempoTotal, c.tipoTempo);

/** Tabela operacional das cartas ativas — Nome/Órgão/Categoria/Prazo/Visitas +
 * link pro portal. Ordena pela procura (visitas no período). Busca client-side
 * + paginação (a lista é grande, ~1200 cartas ativas). */
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
  const [visiveis, setVisiveis] = useState(PASSO);

  const ordenadas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = termo
      ? cartas.filter(
          (c) =>
            c.titulo.toLowerCase().includes(termo) ||
            c.nomePopular?.toLowerCase().includes(termo) ||
            c.orgaoSigla.toLowerCase().includes(termo),
        )
      : cartas;
    return [...base].sort((a, b) => (visitasPorSlug.get(b.slug) ?? 0) - (visitasPorSlug.get(a.slug) ?? 0));
  }, [cartas, busca, visitasPorSlug]);

  const mostrando = ordenadas.slice(0, visiveis);

  if (cartas.length === 0) {
    return <EmptyCard message="Nenhuma carta ativa cadastrada." />;
  }

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
              setVisiveis(PASSO);
            }}
            placeholder="Buscar por serviço, nome popular ou órgão…"
            className="w-full text-sm rounded-md py-2.5 px-3 outline-none"
            style={{ border: "1px solid var(--ds-color-border)", background: "var(--ds-color-background)", color: "var(--ds-color-text-primary)" }}
          />
          <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            {ordenadas.length.toLocaleString("pt-BR")} carta{ordenadas.length === 1 ? "" : "s"} ativa
            {ordenadas.length === 1 ? "" : "s"} · ordenadas pela procura {rotuloPeriodo} · mostrando {mostrando.length.toLocaleString("pt-BR")}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                  <th className="pb-2">Serviço</th>
                  <th className="pb-2">Órgão</th>
                  <th className="pb-2">Categoria</th>
                  <th className="pb-2">Prazo</th>
                  <th className="pb-2 text-right">Acessos</th>
                  <th className="pb-2 text-right">Portal</th>
                </tr>
              </thead>
              <tbody>
                {mostrando.map((c) => (
                  <tr key={c.slug} className="border-t align-top" style={{ borderColor: "var(--ds-color-border)" }}>
                    <td className="py-2 max-w-[240px]">
                      <span className="font-medium" style={{ color: "var(--ds-color-text-primary)" }}>
                        {c.titulo}
                      </span>
                      {c.nomePopular && (
                        <div className="text-xs truncate" style={{ color: "var(--ds-color-text-muted)" }}>
                          {c.nomePopular}
                        </div>
                      )}
                    </td>
                    <td className="py-2 truncate max-w-[120px]" style={{ color: "var(--ds-color-text-secondary)" }}>{c.orgaoSigla}</td>
                    <td className="py-2 truncate max-w-[140px]" style={{ color: "var(--ds-color-text-secondary)" }}>{labelCategoria(c.categoria)}</td>
                    <td className="py-2 text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>{prazoDe(c)}</td>
                    <td className="py-2 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                      {(visitasPorSlug.get(c.slug) ?? 0).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 text-right">
                      <a href={`${PORTAL_BASE}/${c.categoria}/${c.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-xs" style={{ color: "var(--ds-color-primary-600)" }}>
                        Abrir ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
