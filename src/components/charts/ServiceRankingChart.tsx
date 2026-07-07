import { PORTAL_BASE_URL } from "@/components/dashboard/ServiceCardGrid";
import type { PerfilServico } from "@/lib/data";

/**
 * Ranking de serviços por visitas — barra horizontal clicável (abre o serviço
 * real no portal, nova aba). Cada linha: nome do serviço + perfil + visitas.
 * Barra mais longa = mais visitas; a 1ª linha é sempre o serviço líder.
 */
export function ServiceRankingChart({ servicos }: { servicos: PerfilServico[] }) {
  const topo = servicos[0]?.visitas || 0;
  return (
    <div className="flex flex-col gap-3">
      {servicos.map((s, i) => {
        const largura = topo > 0 ? Math.max((s.visitas / topo) * 100, 4) : 0;
        return (
          <a
            key={s.path}
            href={`${PORTAL_BASE_URL}${s.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block group rounded px-2 py-1.5 -mx-2 transition-colors hover:bg-[var(--ds-color-background-muted)]"
          >
            <div className="flex justify-between items-baseline gap-3 text-sm mb-1">
              <span
                className="font-medium truncate group-hover:underline"
                style={{ color: "var(--ds-color-text-primary)" }}
              >
                {s.servico}
              </span>
              <span className="shrink-0 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                {s.perfilLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded" style={{ background: "var(--ds-color-background-muted)" }}>
                <div
                  className="h-2.5 rounded"
                  style={{
                    width: `${largura}%`,
                    background: i === 0 ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)",
                  }}
                />
              </div>
              <span
                className="shrink-0 w-16 text-right text-sm font-semibold"
                style={{ color: "var(--ds-color-primary-600)" }}
              >
                {s.visitas.toLocaleString("pt-BR")}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
