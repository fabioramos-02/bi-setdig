import { redirect } from "next/navigation";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { getMatomoSites } from "@/lib/data";

/** Sem listagem própria — o select "Site" na Sidebar (SidebarSiteSelect) é a
 * navegação entre sites. /sites cai direto no Portal de Serviços MS (o principal);
 * se não existir no dataset, cai no primeiro (ordem alfabética). */
export default function SitesPage() {
  const sites = getMatomoSites();
  if (sites.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Sites" />
        <main className="flex-1 p-4 sm:p-6">
          <EmptyCard message="Ainda não há sites disponíveis aqui." />
        </main>
      </div>
    );
  }
  const preferido = sites.find((s) => s.nome === "PORTAL DE SERVICOS MS") ?? sites[0];
  redirect(`/sites/${preferido.idsite}`);
}
