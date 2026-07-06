/**
 * Funil de conversão — degraus horizontais decrescentes. Réplica temada do
 * go.Funnel do bench-carta (sections.py), em CSS puro: largura ∝ valor,
 * cor única do DS com opacidade decrescente por etapa. Sem dependência nova.
 */
export function FunnelChart({ steps }: { steps: { label: string; value: number }[] }) {
  const topo = steps[0]?.value || 0;
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const largura = topo > 0 ? Math.max((s.value / topo) * 100, 6) : 0;
        const pct = topo > 0 ? (s.value / topo) * 100 : 0;
        return (
          <div key={s.label}>
            <div className="flex justify-between items-baseline text-sm mb-1" style={{ color: "var(--ds-color-text-secondary)" }}>
              <span>{s.label}</span>
              <span>
                <strong style={{ color: "var(--ds-color-text-primary)" }}>{s.value.toLocaleString("pt-BR")}</strong>
                {i > 0 && <span className="ml-2 text-xs">({pct < 1 ? pct.toFixed(2) : pct.toFixed(0)}% do topo)</span>}
              </span>
            </div>
            <div
              className="h-9 rounded"
              style={{
                width: `${largura}%`,
                minWidth: 28,
                background: "var(--ds-color-primary-600)",
                opacity: 1 - i * 0.22,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
