/** Anel de progresso de valor único (% dos serviços que já resolvem pela
 * internet). Réplica do `.donut` do site original: conic-gradient verde até o
 * percentual, resto cinza, furo no meio com o número grande. CSS puro, sem lib.
 * O furo usa o fundo do tema (não branco fixo) pra funcionar no escuro. */
export function DonutProgresso({ pct, legenda = "resolvem pela internet" }: { pct: number; legenda?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <div
        className="relative rounded-full"
        style={{
          width: 168,
          height: 168,
          background: `conic-gradient(var(--ds-color-success) ${pct * 3.6}deg, var(--ds-color-background-muted) 0)`,
        }}
        role="img"
        aria-label={`${pct.toLocaleString("pt-BR")}% ${legenda}`}
      >
        <div
          className="absolute rounded-full grid place-content-center text-center"
          style={{ inset: 22, background: "var(--ds-color-background)" }}
        >
          <span className="text-4xl font-bold" style={{ color: "var(--ds-color-success)" }}>
            {pct.toLocaleString("pt-BR")}%
          </span>
        </div>
      </div>
      <p className="text-sm text-center" style={{ color: "var(--ds-color-text-secondary)" }}>
        {legenda}
      </p>
    </div>
  );
}
