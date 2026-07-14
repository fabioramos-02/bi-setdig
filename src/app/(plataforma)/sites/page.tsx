import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { getMatomoSites } from "@/lib/data";

export const metadata: Metadata = {
  title: "Sites | SETDIG",
};

/** Relação dos sites monitorados no Matomo (SitesManager) — listagem estática
 * (não tem filtro de período). Server Component: sem estado, só lê o dataset e
 * renderiza links. */
export default function SitesPage() {
  const sites = getMatomoSites();

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Sites" />
      <main className="flex-1 p-4 sm:p-6">
        {sites.length === 0 ? (
          <EmptyCard message="Nenhum site conectado ainda." />
        ) : (
          <>
            <p className="mb-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
              {sites.length} sites do Estado monitorados no Matomo. Clique para abrir o site.
            </p>
            <ul className="flex flex-col gap-2">
              {sites.map((s) => (
                <li
                  key={s.idsite}
                  className="flex items-center justify-between gap-3 rounded px-4 py-3"
                  style={{ border: "1px solid var(--ds-color-border)", background: "var(--ds-color-background)" }}
                >
                  <span className="min-w-0">
                    <span className="font-semibold" style={{ color: "var(--ds-color-text-secondary)" }}>
                      {s.nome}
                    </span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm hover:underline"
                      style={{ color: "var(--ds-color-primary-600)" }}
                    >
                      {s.url} ↗
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
