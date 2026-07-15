import { redirect } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { getMatomoSites } from "@/lib/data";

/** Sem listagem própria — o select "Site" na Sidebar (SidebarSiteSelect) é a
 * navegação entre sites. /sites cai direto no primeiro (ordem alfabética,
 * já vem assim de transform/matomo.py::sites). */
export default function SitesPage() {
  const sites = getMatomoSites();
  if (sites.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Sites" />
        <main className="flex-1 p-4 sm:p-6">
          <EmptyCard message="Nenhum site conectado ainda." />
        </main>
      </div>
    );
  }
  redirect(`/sites/${sites[0].idsite}`);
}
