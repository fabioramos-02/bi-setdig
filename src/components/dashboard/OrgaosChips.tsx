/** Chips sutis com siglas de órgãos responsáveis. Uso: card de categoria,
 *  ranking, header de drill-down. Array vazio → renderiza nada (não é bug,
 *  mapa é seletivo). */
export function OrgaosChips({
  orgaos,
  tamanho = "xs",
  align = "center",
}: {
  orgaos: string[];
  tamanho?: "xs" | "sm";
  align?: "start" | "center";
}) {
  if (orgaos.length === 0) return null;
  const alinhamento = align === "center" ? "justify-center" : "justify-start";
  const fonte = tamanho === "xs" ? "text-xs" : "text-sm";
  return (
    <span
      className={`inline-flex flex-wrap gap-1.5 items-center ${alinhamento}`}
      aria-label={`Órgãos responsáveis: ${orgaos.join(", ")}`}
    >
      {orgaos.map((sigla) => (
        <span
          key={sigla}
          aria-hidden
          className={`${fonte} font-semibold px-2 py-0.5 rounded whitespace-nowrap`}
          style={{
            background: "var(--ds-color-primary-50, #e6f0fa)",
            color: "var(--ds-color-primary-700, #0b3d75)",
            border: "1px solid var(--ds-color-primary-200, #b3d1ec)",
          }}
        >
          {sigla}
        </span>
      ))}
    </span>
  );
}
