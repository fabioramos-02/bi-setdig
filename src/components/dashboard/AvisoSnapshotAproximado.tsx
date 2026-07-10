/** "Intervalo de datas" não tem recorte próprio pra breakdowns de categoria
 * (ADR-007 — Matomo/GA4 não têm série temporal nesses relatórios). Toda tab
 * que indexa um `BreakdownPorPeriodo<T>` por `periodoAtual` cai no snapshot
 * do mês quando o usuário escolhe intervalo — esse aviso torna isso visível,
 * em vez de deixar o número parecer atualizado quando não está. */
export function AvisoSnapshotAproximado({ tipoIntervalo }: { tipoIntervalo: boolean }) {
  if (!tipoIntervalo) return null;

  return (
    <p
      className="mb-4 text-sm rounded"
      style={{
        background: "var(--ds-color-background-muted)",
        color: "var(--ds-color-text-secondary)",
        padding: "var(--ds-spacing-12)",
      }}
    >
      Este painel não tem recorte por intervalo arbitrário (ADR-007) — exibindo o snapshot do <strong>mês</strong>.
    </p>
  );
}
