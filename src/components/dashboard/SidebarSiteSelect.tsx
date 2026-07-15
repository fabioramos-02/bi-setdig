"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Site } from "@/lib/data";

/** Select de site — aparece só em /sites/[idsite], acima do filtro de período
 * (mesma posição/ordem do dropdown de site no dashboard Streamlit irmão).
 * Trocar o valor navega direto pro dashboard do site escolhido. */
export function SidebarSiteSelect({ sites }: { sites: Site[] }) {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname.startsWith("/sites/") || sites.length === 0) return null;

  const idsiteAtual = pathname.split("/")[2] ?? "";

  return (
    <div style={{ borderTop: "1px solid var(--ds-color-border)" }} className="px-4 py-4">
      <h2 style={{ color: "var(--ds-color-text-secondary)" }} className="text-xs font-semibold uppercase mb-3">
        Site
      </h2>
      <label className="ds-field">
        <span className="ds-field__label">Selecionar site</span>
        <select
          className="ds-select"
          value={idsiteAtual}
          onChange={(e) => router.push(`/sites/${e.target.value}`)}
        >
          {sites.map((s) => (
            <option key={s.idsite} value={s.idsite}>
              {s.nome}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
