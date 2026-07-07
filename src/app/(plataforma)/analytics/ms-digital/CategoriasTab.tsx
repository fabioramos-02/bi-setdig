"use client";

import { useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import type { ServicoCatalogo } from "@/lib/data";
import type { ResumoCatalogo, CategoriaResumo } from "@/lib/catalogo-app";

/** Categorias do app + serviços nativo × web — catálogo estático da planilha
 * (não varia por período). Referência de apresentação: bench-carta app_view.py
 * (grid de categorias, nativo×web, storytelling). "N pessoas" (união GA4) fica
 * pra depois — aqui é a relação de serviços, não a métrica de uso. */
export function CategoriasTab({
  servicos,
  resumo,
  categorias,
}: {
  servicos: ServicoCatalogo[];
  resumo: ResumoCatalogo;
  categorias: CategoriaResumo[];
}) {
  const [sel, setSel] = useState<string | null>(null);
  const pctWeb = resumo.total > 0 ? Math.round((resumo.web / resumo.total) * 10) : 0;
  const csv = servicos.map((s) => ({
    Categoria: s.categoria,
    Serviço: s.servico,
    Tipo: s.tipo === "nativo" ? "Nativo" : "Web",
    Status: s.ativo ? "Ativo" : "Inativo",
  }));
  const servicosSel = sel ? servicos.filter((s) => s.categoria === sel) : [];

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`O app reúne ${resumo.total} serviços em ${resumo.categorias} categorias. De cada 10, cerca de ${pctWeb} abrem um site externo e o resto são telas do próprio app.`}
        caption={`${resumo.nativo} serviços nativos e ${resumo.web} que abrem o navegador. ${resumo.ativo} estão ativos, ${resumo.inativo} desativados.`}
        comoLer="Nativo = a tela abre dentro do app. Web = o app manda o cidadão para um site externo. Quanto mais nativo, mais o serviço vive de fato dentro do app."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <MetricCard label="Serviços no app" value={resumo.total} sub={`${resumo.ativo} ativos`} />
        <MetricCard label="Nativos (tela no app)" value={resumo.nativo} />
        <MetricCard label="Web (abrem site externo)" value={resumo.web} />
      </div>

      <DashboardSection title="Nativos × web">
        <BarChart
          data={[
            { tipo: "Nativos", quantidade: resumo.nativo },
            { tipo: "Web (abre site)", quantidade: resumo.web },
          ]}
          xKey="tipo"
          yKey="quantidade"
          height={220}
          corPorIndice={(i) => (i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)")}
        />
      </DashboardSection>

      <DashboardSection
        title="Categorias do app"
        action={<ExportCsvButton rows={csv} filename="app-catalogo-servicos" />}
      >
        <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Número = serviços cadastrados na categoria. Clique numa categoria para ver a lista de serviços.
        </p>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {categorias.map((c) => {
            const ativo = c.categoria === sel;
            return (
              <button
                key={c.categoria}
                type="button"
                onClick={() => setSel(ativo ? null : c.categoria)}
                className="flex flex-col items-center text-center rounded p-4 transition-shadow hover:shadow-md"
                style={{
                  background: "var(--ds-color-background)",
                  border: ativo ? "2px solid var(--ds-color-primary-600)" : "1px solid var(--ds-color-border)",
                }}
              >
                <span
                  className="material-icons mb-2"
                  style={{ color: "var(--ds-color-primary-600)", fontSize: 32 }}
                  aria-hidden
                >
                  {c.icone}
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--ds-color-text-secondary)" }}>
                  {c.categoria}
                </span>
                <span className="text-xs mt-1" style={{ color: "var(--ds-color-text-muted)" }}>
                  {c.total} serviços · {c.nativo} nativos · {c.web} web
                </span>
              </button>
            );
          })}
        </div>

        {sel && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--ds-color-text-secondary)" }}>
              {sel} — {servicosSel.length} serviços
            </h3>
            <ul className="flex flex-col gap-2">
              {servicosSel.map((s) => (
                <li
                  key={s.servico}
                  className="flex items-center justify-between rounded px-3 py-2 text-sm"
                  style={{ border: "1px solid var(--ds-color-border)", color: "var(--ds-color-text-secondary)" }}
                >
                  <span>{s.servico}</span>
                  <span className="flex items-center gap-2 text-xs shrink-0">
                    <span
                      className="rounded px-2 py-0.5"
                      style={{
                        background: s.tipo === "nativo" ? "var(--ds-color-primary-600)" : "var(--ds-color-background-muted)",
                        color: s.tipo === "nativo" ? "var(--ds-color-text-inverse)" : "var(--ds-color-text-secondary)",
                      }}
                    >
                      {s.tipo === "nativo" ? "Nativo" : "Web"}
                    </span>
                    {!s.ativo && <span style={{ color: "var(--ds-color-text-muted)" }}>Inativo</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DashboardSection>
    </div>
  );
}
