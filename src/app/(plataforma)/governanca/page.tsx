import type { Metadata } from "next";
import { GovernancaClient } from "./GovernancaClient";
import { getMatomoPerfilFiltro } from "@/lib/data";

export const metadata: Metadata = {
  title: "Governança — Uso do Filtro de Perfil | SETDIG",
};

export default function GovernancaPage() {
  // SSG: lê o dataset publicado pelo data-platform, sem chamada a API em runtime
  // (ADR-001). O filtro de período (sidebar) reage client-side no GovernancaClient.
  const perfil = getMatomoPerfilFiltro();
  return <GovernancaClient perfil={perfil} />;
}
