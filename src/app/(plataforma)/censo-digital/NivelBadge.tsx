import { corDoNivel, rotuloDoNivel } from "@/lib/censo";

/** Pílula colorida do nível de maturidade (0–4). Cor = rampa presencial→digital.
 * `compacto` mostra só o número (uso em tabela); completo mostra "Nº — rótulo". */
export function NivelBadge({ nivel, compacto = false }: { nivel: number; compacto?: boolean }) {
  const cor = corDoNivel(nivel);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ color: cor, background: `color-mix(in srgb, ${cor} 14%, transparent)` }}
      title={`Nível ${nivel} — ${rotuloDoNivel(nivel)}`}
    >
      <span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ background: cor }}
        aria-hidden
      />
      {compacto ? `N${nivel}` : `N${nivel} — ${rotuloDoNivel(nivel)}`}
    </span>
  );
}
