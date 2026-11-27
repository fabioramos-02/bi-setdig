import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import {
  getCartasInventarioResumo,
  getCartasInventarioPorOrgao,
  getCartasInventarioRelacao,
  getCartasAtualizacoesPorAno,
  getCartasAtualizacoesDiarias,
  getDatasetUpdatedAt,
  getMatomoAcessosCartas,
} from "@/lib/data";
import type { AcessoSlug } from "@/lib/acessos-cartas";
import type { PeriodoFixo } from "@/lib/data";
import { ServicosClient } from "./ServicosClient";

export const metadata: Metadata = {
  title: "Carta de Serviços | SETDIG",
};

export default function ServicosPage() {
  const resumo = getCartasInventarioResumo();
  const orgaos = getCartasInventarioPorOrgao();
  const relacao = getCartasInventarioRelacao();

  if (!resumo) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="Carta de Serviços" />
        <main className="flex-1 p-6">
          <EmptyCard message="Ainda não há dados disponíveis aqui." />
        </main>
      </div>
    );
  }

  // Só [slug, visitas] vai ao navegador: título, órgão e setor vêm da relação.
  const acessos = getMatomoAcessosCartas();
  const acessosGravados = Object.fromEntries(
    (["dia", "semana", "mes", "ano"] as PeriodoFixo[]).map((k) => [k, (acessos[k] ?? []).map((a): AcessoSlug => [a.slug, a.visitas])]),
  ) as Record<PeriodoFixo, AcessoSlug[]>;

  return (
    <ServicosClient
      resumo={resumo}
      orgaos={orgaos}
      relacao={relacao}
      acessosGravados={acessosGravados}
      atualizacoes={{
        porAno: getCartasAtualizacoesPorAno(),
        porDia: getCartasAtualizacoesDiarias(),
        atualizadoEm: getDatasetUpdatedAt("cartas", "atualizacoes-por-ano"),
      }}
    />
  );
}
