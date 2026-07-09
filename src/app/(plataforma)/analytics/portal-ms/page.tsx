import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { normalizarNomeCidade } from "@/lib/normalizar-cidade";
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
  getMatomoPadraoComportamental,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Analytics — Portal MS | SETDIG",
};

function calcularMatchRateMapa(cidadesMes: { cidade: string; visitas: number }[]): number {
  const geojsonPath = path.join(process.cwd(), "public", "geo", "ms-municipios.geojson");
  const nomesGeojson = new Set<string>(
    JSON.parse(fs.readFileSync(geojsonPath, "utf-8")).features.map((f: { properties: { name: string } }) =>
      normalizarNomeCidade(f.properties.name)
    )
  );
  if (cidadesMes.length === 0) return 0;
  return cidadesMes.filter((c) => nomesGeojson.has(normalizarNomeCidade(c.cidade))).length / cidadesMes.length;
}

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
  const padraoComportamental = getMatomoPadraoComportamental();

  if (diarias.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Analytics — Portal MS" />
        <main className="flex-1 p-6">
          <EmptyCard message="Nenhuma fonte de dados conectada ainda." />
        </main>
      </div>
    );
  }

  // Taxa de match cidade x geojson calculada sobre o snapshot "mês" (o mesmo
  // usado como fallback pro "Intervalo de datas") — se ficar baixa, o
  // ChoroplethMap cai pra BarChart independente de qual período o usuário
  // escolher (ver PortalMsClient).
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
      padraoComportamental={padraoComportamental}
    />
  );
}
