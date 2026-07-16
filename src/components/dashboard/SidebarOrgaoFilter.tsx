"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ErroOrgao } from "@/lib/data";

/** Filtro de órgão dentro da sidebar — aparece só em /qualidade. Estado vive
 * na URL (?orgao=SIGLA), não em Context: só uma rota consome, e query string
 * é bookmarkável/compartilhável, sem precisar de mais um Provider no layout
 * global. Precisa estar dentro de <Suspense> (useSearchParams). */
export function SidebarOrgaoFilter({ orgaos }: { orgaos: ErroOrgao[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (pathname !== "/avaliacao-carta" || orgaos.length === 0) return null;

  const atual = searchParams.get("orgao") ?? "";

  const mudar = (sigla: string) => {
    const params = new URLSearchParams(searchParams);
    if (sigla) params.set("orgao", sigla);
    else params.delete("orgao");
    router.push(`/avaliacao-carta${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div style={{ borderTop: "1px solid var(--ds-color-border)" }} className="px-4 py-4">
      <h2 style={{ color: "var(--ds-color-text-secondary)" }} className="text-xs font-semibold uppercase mb-3">
        Órgão
      </h2>
      <label className="ds-field">
        <span className="ds-field__label">Filtrar por órgão</span>
        <select className="ds-select" value={atual} onChange={(e) => mudar(e.target.value)}>
          <option value="">Todos os órgãos</option>
          {orgaos.map((o) => (
            <option key={o.orgaoSigla} value={o.orgaoSigla}>
              {o.orgaoSigla}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
