/** "Intervalo de datas" agora busca dado ao vivo (Matomo period=range / GA4
 * range nativo — ADR-010) pra parte dos painéis. Enquanto isso não estiver
 * plugado num painel específico (ou como fallback se o fetch falhar), ele
 * cai no snapshot do mês (ADR-007) — este componente cobre os 3 estados
 * possíveis nessa janela de tempo. `tipoIntervalo` (legado) continua
 * aceito pra painéis que ainda não têm busca ao vivo. */
export type StatusIntervalo = "ok" | "carregando" | "fallback";

export function AvisoSnapshotAproximado({
  tipoIntervalo,
  status,
}: {
  tipoIntervalo?: boolean;
  status?: StatusIntervalo;
}) {
  const efetivo: StatusIntervalo = status ?? (tipoIntervalo ? "fallback" : "ok");
  if (efetivo === "ok") return null;

  const texto =
    efetivo === "carregando"
      ? "Buscando os dados mais recentes desse período…"
      : (
          <>
            Este painel ainda não busca dados de qualquer período em tempo real — está mostrando os números mais
            recentes do <strong>mês</strong>.
          </>
        );

  return (
    <p
      className="mb-4 text-sm rounded"
      style={{
        background: "var(--ds-color-background-muted)",
        color: "var(--ds-color-text-secondary)",
        padding: "var(--ds-spacing-12)",
      }}
    >
      {texto}
    </p>
  );
}
