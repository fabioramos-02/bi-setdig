import { Sidebar } from "@/components/ds/Sidebar";
import { PeriodoProvider } from "@/lib/periodo-context";
import { getMatomoVisitasDiarias } from "@/lib/data";

export default function PlataformaLayout({ children }: { children: React.ReactNode }) {
  // min/max da série diária alimentam o filtro de período que vive na Sidebar
  // (compartilhado com o conteúdo via PeriodoProvider). Leitura build-time
  // (SSG), barata — só as bordas da série de 370 dias.
  const diarias = getMatomoVisitasDiarias();
  const min = diarias[0]?.data ?? "";
  const max = diarias[diarias.length - 1]?.data ?? "";

  return (
    <PeriodoProvider min={min} max={max}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col md:pl-64">{children}</div>
      </div>
    </PeriodoProvider>
  );
}
