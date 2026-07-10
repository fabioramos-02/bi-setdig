"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { corCategorica } from "@/lib/categorical-palette";
import { labelCategoria, ORIGEM_MATURIDADE_LABEL } from "@/lib/servicos";
import type { CartaRelacao } from "@/lib/data";

const PASSO = 50;

/** Conteúdo da aba "Relação de Cartas" — listagem completa (não agregada),
 * a peça de UI mais densa do domínio Serviços: ~1500 linhas em memória
 * (ADR-001, zero API em runtime), busca client-side, renderização capada
 * (não desmonta o DOM inteiro em mobile). Extraído de ServicosClient pra
 * não estourar 250 linhas/arquivo. */
export function RelacaoTab({ cartas }: { cartas: CartaRelacao[] }) {
  const [busca, setBusca] = useState("");
  const [visiveis, setVisiveis] = useState(PASSO);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cartas;
    return cartas.filter(
      (c) =>
        c.titulo.toLowerCase().includes(termo) ||
        c.nomePopular?.toLowerCase().includes(termo) ||
        c.orgao.toLowerCase().includes(termo) ||
        c.orgaoSigla.toLowerCase().includes(termo)
    );
  }, [cartas, busca]);

  const mostrando = filtradas.slice(0, visiveis);

  if (cartas.length === 0) {
    return <EmptyCard message="Nenhuma carta cadastrada." />;
  }

  return (
    <DashboardSection
      title="Relação completa de cartas"
      action={
        <ExportCsvButton
          rows={cartas.map((c) => ({
            titulo: c.titulo,
            nomePopular: c.nomePopular ?? "",
            slug: c.slug,
            orgao: c.orgao,
            orgaoSigla: c.orgaoSigla,
            categoria: c.categoria ?? "",
            publico: c.publico ?? "",
            publicoEspecifico: c.publicoEspecifico.join("; "),
            ativo: c.ativo ? "sim" : "não",
            digital: c.digital ? "sim" : "não",
            online: c.online ? "sim" : "não",
            destaque: c.destaque ? "sim" : "não",
            custo: c.custo ?? "",
            tempoTotal: c.tempoTotal ?? "",
            tipoTempo: c.tipoTempo ?? "",
            nivelMaturidade: c.nivelMaturidade,
            maturidadeOrigem: c.maturidadeOrigem,
            updatedAt: c.updatedAt ?? "",
          }))}
          filename="relacao-de-cartas"
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: "var(--ds-color-text-muted)" }}
          >
            🔎
          </span>
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setVisiveis(PASSO);
            }}
            placeholder="Buscar por título, nome popular ou órgão…"
            className="w-full text-sm rounded-md py-2.5 pl-9 pr-3 outline-none transition-shadow"
            style={{
              border: "1px solid var(--ds-color-border)",
              background: "var(--ds-color-background)",
              color: "var(--ds-color-text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px var(--ds-color-primary-600)")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          />
        </div>

        <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          {filtradas.length.toLocaleString("pt-BR")} carta{filtradas.length === 1 ? "" : "s"}
          {busca && ` de ${cartas.length.toLocaleString("pt-BR")} no total`} · mostrando{" "}
          {mostrando.length.toLocaleString("pt-BR")}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
                <th className="pb-2">Carta</th>
                <th className="pb-2">Órgão</th>
                <th className="pb-2">Categoria</th>
                <th className="pb-2">Maturidade</th>
                <th className="pb-2 text-right">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {mostrando.map((c) => (
                <tr key={c.slug} className="border-t align-top" style={{ borderColor: "var(--ds-color-border)" }}>
                  <td className="py-2 max-w-[220px] sm:max-w-none">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate" style={{ color: "var(--ds-color-text-primary)" }}>
                        {c.titulo}
                      </span>
                      {c.destaque && <span title="Serviço em destaque">⭐</span>}
                    </div>
                    {c.nomePopular && (
                      <div className="text-xs truncate" style={{ color: "var(--ds-color-text-muted)" }}>
                        {c.nomePopular}
                      </div>
                    )}
                  </td>
                  <td className="py-2 truncate max-w-[140px]" style={{ color: "var(--ds-color-text-secondary)" }}>
                    {c.orgaoSigla}
                  </td>
                  <td className="py-2 truncate max-w-[140px]" style={{ color: "var(--ds-color-text-secondary)" }}>
                    {labelCategoria(c.categoria)}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold text-white shrink-0"
                        style={{ background: corCategorica(c.nivelMaturidade) }}
                      >
                        {c.nivelMaturidade}
                      </span>
                      <span
                        className="text-xs hidden sm:inline"
                        style={{ color: "var(--ds-color-text-muted)" }}
                        title={ORIGEM_MATURIDADE_LABEL[c.maturidadeOrigem]}
                      >
                        {c.maturidadeOrigem === "classificada" ? "revisado" : "estimado"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                    {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visiveis < filtradas.length && (
          <button
            type="button"
            onClick={() => setVisiveis((v) => v + PASSO)}
            className="self-center text-sm font-medium rounded-md px-4 py-2 transition-colors"
            style={{ color: "var(--ds-color-primary-600)", border: "1px solid var(--ds-color-border)" }}
          >
            Carregar mais ({(filtradas.length - visiveis).toLocaleString("pt-BR")} restantes)
          </button>
        )}
      </div>
    </DashboardSection>
  );
}
