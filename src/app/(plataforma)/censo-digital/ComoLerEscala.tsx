import { NIVEIS } from "@/lib/censo";

/** "Como ler a escala 0–4" — a régua de maturidade explicada em linguagem
 * simples, recolhida por padrão pra não pesar a tela. Presente nas duas telas
 * do censo (panorama e por órgão). */
export function ComoLerEscala() {
  return (
    <details
      style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", background: "var(--ds-color-background)" }}
      className="break-inside-avoid"
    >
      <summary
        className="cursor-pointer select-none px-4 py-3 text-sm font-semibold"
        style={{ color: "var(--ds-color-text-primary)" }}
      >
        Como ler a escala de 0 a 4
      </summary>
      <div className="px-4 pb-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ color: "var(--ds-color-text-secondary)" }} className="text-left text-xs uppercase tracking-wide">
              <th className="py-2 pr-3 font-semibold">Nível</th>
              <th className="py-2 pr-3 font-semibold">O que significa</th>
              <th className="py-2 font-semibold whitespace-nowrap">Resolve online?</th>
            </tr>
          </thead>
          <tbody>
            {NIVEIS.map((n) => (
              <tr key={n.nivel} style={{ borderTop: "1px solid var(--ds-color-border)" }} className="align-top">
                <td className="py-2 pr-3 whitespace-nowrap font-semibold" style={{ color: n.cor }}>
                  N{n.nivel} — {n.rotulo}
                </td>
                <td className="py-2 pr-3" style={{ color: "var(--ds-color-text-secondary)" }}>
                  {n.descricao}
                </td>
                <td className="py-2 whitespace-nowrap" style={{ color: "var(--ds-color-text-secondary)" }}>
                  {n.ehDigital}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          A classificação é feita com apoio de inteligência artificial e revisada por pessoas — pode conter aproximações.
        </p>
      </div>
    </details>
  );
}
