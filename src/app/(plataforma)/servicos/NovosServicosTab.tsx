"use client";

import { useMemo } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { LineChart } from "@/components/charts/LineChart";
import { labelCategoria, prazoServico } from "@/lib/servicos";
import type { CartaRelacao } from "@/lib/data";

const PORTAL_BASE = "https://www.ms.gov.br";

const prazoDe = (c: CartaRelacao) => prazoServico(c.tempoTotal, c.tipoTempo);

/** Serviços cadastrados mais recentemente (por data de cadastro). Depende de
 * `createdAt`, que só vem após rodar o pipeline com a SQL estendida (VPN) —
 * antes disso mostra um estado vazio honesto. */
export function NovosServicosTab({ cartas }: { cartas: CartaRelacao[] }) {
  const comData = useMemo(() => cartas.filter((c) => c.createdAt), [cartas]);

  // Quantos serviços entraram no cadastro por mês — mesmo dado da tabela
  // abaixo (createdAt), só agrupado; não precisa de fetch novo.
  const porMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comData) {
      const chave = c.createdAt!.slice(0, 7);
      m.set(chave, (m.get(chave) ?? 0) + 1);
    }
    return [...m.entries()].map(([mes, total]) => ({ mes, total })).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [comData]);

  if (comData.length === 0) {
    return (
      <EmptyCard message="A data de cadastro dos serviços ainda não está disponível — depende de uma nova extração do inventário. Assim que ela chegar, os serviços mais novos aparecem aqui." />
    );
  }

  const recentes = [...comData].sort((a, b) => (b.createdAt! > a.createdAt! ? 1 : -1)).slice(0, 30);

  return (
    <div className="flex flex-col gap-6">
      <DashboardSection title="Evolução de serviços incluídos no portal">
        <p className="mb-3 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Quantos serviços novos entraram no cadastro do portal a cada mês.
        </p>
        <LineChart data={porMes} xKey="mes" yKey="total" height={240} />
      </DashboardSection>

      <DashboardSection title="Serviços cadastrados mais recentemente">
        <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Os 30 serviços mais novos no cadastro do portal, do mais recente ao mais antigo.
        </p>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--ds-color-text-secondary)" }}>
              <th className="pb-2">Serviço</th>
              <th className="pb-2">Órgão</th>
              <th className="pb-2">Categoria</th>
              <th className="pb-2">Prazo</th>
              <th className="pb-2 text-right">Cadastrado em</th>
            </tr>
          </thead>
          <tbody>
            {recentes.map((c) => (
              <tr key={c.slug} className="border-t align-top" style={{ borderColor: "var(--ds-color-border)" }}>
                <td className="py-2 max-w-[260px]">
                  <a href={`${PORTAL_BASE}/${c.categoria}/${c.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: "var(--ds-color-primary-600)" }}>
                    {c.titulo} ↗
                  </a>
                </td>
                <td className="py-2 truncate max-w-[120px]" style={{ color: "var(--ds-color-text-secondary)" }}>{c.orgaoSigla}</td>
                <td className="py-2 truncate max-w-[140px]" style={{ color: "var(--ds-color-text-secondary)" }}>{labelCategoria(c.categoria)}</td>
                <td className="py-2 text-xs" style={{ color: "var(--ds-color-text-secondary)" }}>{prazoDe(c)}</td>
                <td className="py-2 text-right text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </DashboardSection>
    </div>
  );
}
