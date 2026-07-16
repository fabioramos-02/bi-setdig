import { corDoNivel, rotuloDoNivel } from "@/lib/censo";

/** Pílula colorida do nível de maturidade (0–4). Cor = rampa presencial→digital.
 * - default: tom claro (fundo tingido + texto colorido) — uso em tabela.
 * - `compacto`: só o número (N2), tom claro.
 * - `solido`: pílula cheia da cor + número em caixa escura + rótulo — réplica do
 *   `.badge` do site original, usada na régua "Como ler". */
export function NivelBadge({ nivel, compacto = false, solido = false }: { nivel: number; compacto?: boolean; solido?: boolean }) {
  const cor = corDoNivel(nivel);
  const rotulo = rotuloDoNivel(nivel);

  if (solido) {
    // N2 é âmbar (claro) — texto escuro pra contraste; demais texto branco.
    const texto = nivel === 2 ? "#1a1a1a" : "#fff";
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold whitespace-nowrap"
        style={{ background: cor, color: texto }}
      >
        <span className="rounded px-1" style={{ background: "rgba(0,0,0,.22)" }}>N{nivel}</span>
        {rotulo}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ color: cor, background: `color-mix(in srgb, ${cor} 14%, transparent)` }}
      title={`Nível ${nivel} — ${rotulo}`}
    >
      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: cor }} aria-hidden />
      {compacto ? `N${nivel}` : `N${nivel} — ${rotulo}`}
    </span>
  );
}
