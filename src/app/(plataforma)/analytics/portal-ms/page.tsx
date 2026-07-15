import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { calcularMatchRateMapa } from "@/lib/server/geo-match";
import { PortalMsClient } from "./PortalMsClient";
import {
  getMatomoVisitasDiarias,
  getMatomoGeografia,
  getMatomoNavegadores,
  getMatomoDispositivos,
  getMatomoHorarios,
  getMatomoPaginas,
  getMatomoBusca,
  getMatomoPerfilFiltro,
  getMatomoServicosMaisAcessados,
  getMatomoPortasEntrada,
  getMatomoFugaHub,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Analytics — Portal Único | SETDIG",
};

export default function AnalyticsPortalMsPage() {
  const diarias = getMatomoVisitasDiarias();
  const cidades = getMatomoGeografia();
  const navegadores = getMatomoNavegadores();
  const dispositivos = getMatomoDispositivos();
  const horarios = getMatomoHorarios();
  const paginas = getMatomoPaginas();
  const busca = getMatomoBusca();
  const perfil = getMatomoPerfilFiltro();
  const servicosMaisAcessados = getMatomoServicosMaisAcessados();
  const portasEntrada = getMatomoPortasEntrada();
  const fugaHub = getMatomoFugaHub();

  if (diarias.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Analytics — Portal Único" />
        <main className="flex-1 p-6">
          <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
        </main>
      </div>
    );
  }

  // Taxa de match cidade x geojson — decide se o mapa vira ChoroplethMap ou cai
  // pra BarChart. Calculada uma vez sobre o snapshot "mês" e NÃO reindexada por
  // período: os rótulos de cidade do Matomo têm formato estável (o conjunto de
  // municípios que casa com o geojson não muda entre dia/semana/mês/ano), então
  // o matchRate é praticamente constante — não vale plumbar o geojson pro client
  // só pra recalcular o mesmo ~valor. ponytail: se algum dia um período trouxer
  // rótulos de cidade em formato diferente, passar o set do geojson ao client.
  const matchRate = calcularMatchRateMapa(cidades.mes);

  return (
    <PortalMsClient
      diarias={diarias}
      navegadores={navegadores}
      dispositivos={dispositivos}
      horarios={horarios}
      cidades={cidades}
      paginas={paginas}
      busca={busca}
      matchRate={matchRate}
      perfil={perfil}
      servicosMaisAcessados={servicosMaisAcessados}
      portasEntrada={portasEntrada}
      fugaHub={fugaHub}
    />
  );
}
