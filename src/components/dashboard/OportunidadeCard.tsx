/**
 * Bloco "Oportunidade" — traduz o dado em recomendação de ação, dentro do
 * StoryCard executivo (padrão "o que aconteceu → o que significa →
 * oportunidade", ver AGENTS.md "BI de gestão"). Presentation puro; o texto
 * vem de lib/ (ex. gerarResumoBusca, gerarResumoPaginas).
 */
export function OportunidadeCard({ texto }: { texto: string }) {
  return (
    <div
      style={{
        background: "var(--ds-color-background-muted)",
        borderLeft: "3px solid var(--ds-color-primary-600)",
        borderRadius: "var(--ds-radius-sm)",
        padding: "var(--ds-spacing-12)",
      }}
      className="text-sm"
    >
      <strong style={{ color: "var(--ds-color-primary-600)" }}>Oportunidade:</strong> {texto}
    </div>
  );
}
