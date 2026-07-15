import { Sidebar } from "@/components/ds/Sidebar";
import { PeriodoProvider } from "@/lib/periodo-context";
import { getMatomoVisitasDiarias, getMatomoSites, getCartasErrosPorOrgao } from "@/lib/data";

export default function PlataformaLayout({ children }: { children: React.ReactNode }) {
  // min/max da série diária alimentam o filtro de período que vive na Sidebar
  // (compartilhado com o conteúdo via PeriodoProvider). Leitura build-time
  // (SSG), barata — só as bordas da série (desde 01/01/2024).
  const diarias = getMatomoVisitasDiarias();
  const min = diarias[0]?.data ?? "";
  const max = diarias[diarias.length - 1]?.data ?? "";
  // Catálogo de sites alimenta o select da Sidebar (/sites/[idsite]) — leitura
  // build-time igual acima, Sidebar é Client e não pode ler o dataset (fs).
  const sites = getMatomoSites();
  // Lista de órgãos pro filtro de /qualidade — mesmo motivo: Sidebar é Client.
  const orgaosQualidade = getCartasErrosPorOrgao()
    .slice()
    .sort((a, b) => a.orgaoSigla.localeCompare(b.orgaoSigla));

  return (
    <PeriodoProvider min={min} max={max}>
      <div className="flex min-h-screen">
        <Sidebar sites={sites} orgaosQualidade={orgaosQualidade} />
        {/* min-w-0: sem isto, gráficos de largura fixa (mapa/Recharts) impedem o
            flex de encolher e estouram o viewport no mobile ("não enquadrado"). */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">{children}</div>
      </div>
    </PeriodoProvider>
  );
}
