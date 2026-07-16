import type { NivelContagem } from "@/lib/censo";

/** Espectro de maturidade: uma barra empilhada presencial→digital (5 faixas
 * coloridas, proporção por quantidade) + a lista dos níveis com quanto e %.
 * Responde "como os serviços se distribuem entre balcão e 100% online?". */
export function EspectroMaturidade({ distribuicao, total }: { distribuicao: NivelContagem[]; total: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 rounded overflow-hidden" style={{ background: "var(--ds-color-background-muted)" }}>
        {distribuicao.map((d) => {
          const pct = total ? (d.qtd / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={d.nivel}
              style={{ width: `${pct}%`, background: d.cor }}
              title={`N${d.nivel} — ${d.rotulo}: ${d.qtd} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      <ul className="flex flex-col gap-2.5">
        {distribuicao.map((d) => {
          const pct = total ? (d.qtd / total) * 100 : 0;
          return (
            <li key={d.nivel}>
              <div className="flex justify-between items-baseline gap-3 text-sm mb-1">
                <span className="font-medium truncate" style={{ color: "var(--ds-color-text-primary)" }}>
                  <span style={{ color: d.cor }}>N{d.nivel}</span> · {d.rotulo}
                </span>
                <span className="shrink-0 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                  {d.qtd.toLocaleString("pt-BR")} ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 rounded" style={{ background: "var(--ds-color-background-muted)" }}>
                <div className="h-2 rounded" style={{ width: `${Math.max(pct, 2)}%`, background: d.cor }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
