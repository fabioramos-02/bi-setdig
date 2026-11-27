"use client";

import { useState } from "react";
import { maisAcessadas, type CartaVisita, type RankVisita } from "@/lib/acessos-cartas";

/** As 10 cartas mais acessadas do período — do portal inteiro ou, com
 * `orgaos`, de um órgão escolhido. Percentual sobre o total de acessos do
 * recorte (portal ou órgão). */
export function CartasMaisAcessadas({
  porCarta,
  orgaos,
  rotuloPeriodo,
}: {
  porCarta: CartaVisita[];
  orgaos?: RankVisita[];
  rotuloPeriodo: string;
}) {
  const [sigla, setSigla] = useState<string | null>(orgaos?.[0]?.rotulo ?? null);
  const orgao = orgaos ? sigla : null;
  const cartas = maisAcessadas(porCarta, orgao);
  const total = (orgao ? porCarta.filter((c) => c.orgaoSigla === orgao) : porCarta).reduce((acc, c) => acc + c.visitas, 0);

  return (
    <div className="flex flex-col gap-3">
      {orgaos && (
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
          Órgão
          <select
            value={sigla ?? ""}
            onChange={(e) => setSigla(e.target.value)}
            className="rounded px-2 py-1 text-sm"
            style={{ border: "1px solid var(--ds-color-border)", background: "var(--ds-color-background)" }}
          >
            {orgaos.map((o) => (
              <option key={o.rotulo} value={o.rotulo}>
                {o.rotulo} ({o.visitas.toLocaleString("pt-BR")} acessos)
              </option>
            ))}
          </select>
        </label>
      )}
      {cartas.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
          Nenhuma carta teve acesso {rotuloPeriodo}.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {cartas.map((c, i) => (
            <li
              key={c.slug}
              className="flex items-center gap-3 py-1.5 px-3 rounded text-sm"
              style={{ background: "var(--ds-color-background-muted)" }}
            >
              <span className="w-6 shrink-0 text-right font-semibold" style={{ color: "var(--ds-color-text-muted)" }}>
                {i + 1}
              </span>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 truncate hover:underline"
                style={{ color: "var(--ds-color-text-primary)" }}
                title={c.titulo}
              >
                {c.titulo}
              </a>
              {!orgao && (
                <span className="shrink-0 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                  {c.orgaoSigla}
                </span>
              )}
              <span className="w-24 shrink-0 text-right font-semibold" style={{ color: "var(--ds-color-primary-600)" }}>
                {c.visitas.toLocaleString("pt-BR")}
                <span className="ml-1 text-xs font-normal" style={{ color: "var(--ds-color-text-muted)" }}>
                  {total > 0 ? `${((c.visitas / total) * 100).toFixed(0)}%` : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
        Acessos {rotuloPeriodo} à página da carta no portal. Percentual sobre {total.toLocaleString("pt-BR")} acessos
        {orgao ? ` às cartas do ${orgao}` : " a todas as cartas"}.
      </p>
    </div>
  );
}
