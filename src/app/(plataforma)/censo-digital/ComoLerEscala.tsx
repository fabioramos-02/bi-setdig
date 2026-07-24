import { NIVEIS, type NivelContagem } from "@/lib/censo";
import { NivelBadge } from "./NivelBadge";

/** "Como ler as categorias" — a régua explicada em linguagem
 * simples, recolhida por padrão. Réplica da rubrica do site original: badge
 * colorido por nível, o que significa, se resolve online e quantos serviços há
 * em cada faixa. `distribuicao` (governo ou órgão) alimenta a coluna de contagem;
 * sem ela, a coluna some. Presente nas duas telas do censo. */
export function ComoLerEscala({ distribuicao }: { distribuicao?: NivelContagem[] }) {
  const qtd = (nivel: number) => distribuicao?.find((d) => d.nivel === nivel)?.qtd;

  return (
    <details
      style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", background: "var(--ds-color-background)" }}
      className="break-inside-avoid"
    >
      <summary
        className="cursor-pointer select-none px-4 py-3 text-base font-bold"
        style={{ color: "var(--ds-color-primary-600)" }}
      >
        Como ler as categorias
      </summary>
      <div className="border-t px-4 pb-4 overflow-x-auto" style={{ borderColor: "var(--ds-color-border)" }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ color: "var(--ds-color-text-secondary)" }} className="text-left text-xs uppercase tracking-wide">
              <th className="py-3 pr-3 font-semibold">Nível</th>
              <th className="py-3 pr-3 font-semibold">O que significa</th>
              <th className="py-3 pr-3 font-semibold whitespace-nowrap">Resolve online?</th>
              {distribuicao && <th className="py-3 font-semibold text-right whitespace-nowrap">Serviços</th>}
            </tr>
          </thead>
          <tbody>
            {NIVEIS.map((n) => (
              <tr key={n.nivel} style={{ borderTop: "1px solid var(--ds-color-border)" }} className="align-middle">
                <td className="py-3 pr-3 whitespace-nowrap">
                  <NivelBadge nivel={n.nivel} solido />
                </td>
                <td className="py-3 pr-3" style={{ color: "var(--ds-color-text-secondary)" }}>
                  {n.descricao}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap" style={{ color: "var(--ds-color-text-secondary)" }}>
                  {n.ehDigital}
                </td>
                {distribuicao && (
                  <td className="py-3 text-right text-lg font-bold whitespace-nowrap" style={{ color: "var(--ds-color-primary-600)" }}>
                    {(qtd(n.nivel) ?? 0).toLocaleString("pt-BR")}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 rounded-md p-3 text-sm" style={{ background: "var(--ds-color-background-muted)", color: "var(--ds-color-text-secondary)" }}>
          <strong style={{ color: "var(--ds-color-text-primary)" }}>Serviços que podem ser digitalizados (níveis 1–2):</strong>{" "}
          serviços que após análise crítica, podem ser transformados. Esse é o foco para a ampliação da entrega de serviços digitais.
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          A classificação é feita com apoio de inteligência artificial e revisada por pessoas, por isso, para maior aproximação da realidade estamos realizando o levantamento junto aos órgãos.
        </p>
      </div>
    </details>
  );
}
