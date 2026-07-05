import type { TermoBusca } from "@/lib/data";

/**
 * Nuvem de palavras caseira — ~20 termos no máximo (ver merge_search no
 * data-platform), volume pequeno o bastante pra flexbox + font-size
 * interpolado resolver sem a complexidade de layout de colisão que só
 * compensa em centenas de termos. Complementa a tabela, não substitui —
 * nuvem não é navegável por teclado/leitor de tela.
 */
export function WordCloud({ termos }: { termos: TermoBusca[] }) {
  if (termos.length === 0) return null;

  const valores = termos.map((t) => t.buscas);
  const min = Math.min(...valores);
  const max = Math.max(...valores);

  const tamanho = (buscas: number) => (max === min ? 20 : 14 + ((buscas - min) / (max - min)) * 26);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline justify-center p-4">
      {termos.map((t) => (
        <span
          key={t.termo}
          title={`${t.buscas.toLocaleString("pt-BR")} buscas`}
          style={{
            fontSize: `${tamanho(t.buscas)}px`,
            color: "var(--ds-color-primary-600)",
            fontWeight: t.buscas === max ? 700 : 500,
            lineHeight: 1.3,
          }}
        >
          {t.termo}
        </span>
      ))}
    </div>
  );
}
