import type { Metadata } from "next";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { EmptyCard } from "@/components/ds/EmptyCard";
import { MsDigitalClient } from "./MsDigitalClient";
import {
  getGa4VisaoGeral,
  getGa4Plataforma,
  getGa4Servicos,
  getGa4Funil,
  getGa4Horarios,
  getMatomoVisitasDiarias,
  getMatomoDispositivos,
  getMatomoServicosMaisAcessados,
  getAppCatalogoServicos,
  getMsdigitalContasResumo,
  getMsdigitalContasPorAno,
  getMsdigitalContasPorFaixaEtaria,
  getMsdigitalContasPorCidade,
  getMsdigitalFaixasDeAcesso,
  getMsdigitalContasCriadasPorDia,
  getDatasetUpdatedAt,
  getGa4FrequenciaAcesso,
  getGa4Geografia,
} from "@/lib/data";
import { resumoCatalogo, porCategoria } from "@/lib/catalogo-app";

export const metadata: Metadata = {
  title: "MS Digital | SETDIG",
};

export default function AnalyticsMsDigitalPage() {
  const visaoGeral = getGa4VisaoGeral();
  const plataforma = getGa4Plataforma();
  const servicos = getGa4Servicos();
  const funil = getGa4Funil();
  const horarios = getGa4Horarios();
  // Cross-BI: dados do portal web (Matomo) pra comparar canais na aba "App × Portal".
  const portalDiarias = getMatomoVisitasDiarias();
  const portalDispositivos = getMatomoDispositivos();
  const portalServicosMaisAcessados = getMatomoServicosMaisAcessados();
  // Catálogo de serviços do app (nativo × web) — estático, da planilha.
  const catalogo = getAppCatalogoServicos();
  // Cadastro (SQL Server MS_digital) — alimenta a 7ª aba "Contas".
  const contasResumo = getMsdigitalContasResumo();
  const contasPorAno = getMsdigitalContasPorAno();
  const contasPorFaixaEtaria = getMsdigitalContasPorFaixaEtaria();
  const contasPorCidade = getMsdigitalContasPorCidade();
  const faixasDeAcesso = getMsdigitalFaixasDeAcesso();
  const snapshotAtualizadoEm = getDatasetUpdatedAt("msdigital-db", "faixas-de-acesso");
  const contasCriadasPorDia = getMsdigitalContasCriadasPorDia();
  const frequenciaAcesso = getGa4FrequenciaAcesso();
  const snapshotFrequenciaEm = getDatasetUpdatedAt("ga4", "frequencia-acesso");
  const geografiaGa4 = getGa4Geografia();

  if (visaoGeral.mes.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <ContentTopBar title="MS Digital" />
        <main className="flex-1 p-6">
          <EmptyCard message="Ainda não há dados disponíveis aqui." />
        </main>
      </div>
    );
  }

  return (
    <MsDigitalClient
      visaoGeral={visaoGeral}
      plataforma={plataforma}
      servicos={servicos}
      funil={funil}
      horarios={horarios}
      portalDiarias={portalDiarias}
      portalDispositivos={portalDispositivos}
      portalServicosMaisAcessados={portalServicosMaisAcessados}
      catalogo={catalogo}
      catalogoResumo={resumoCatalogo(catalogo)}
      catalogoCategorias={porCategoria(catalogo)}
      contasResumo={contasResumo}
      contasPorAno={contasPorAno}
      contasPorFaixaEtaria={contasPorFaixaEtaria}
      contasPorCidade={contasPorCidade}
      faixasDeAcesso={faixasDeAcesso}
      snapshotAtualizadoEm={snapshotAtualizadoEm}
      contasCriadasPorDia={contasCriadasPorDia}
      frequenciaAcesso={frequenciaAcesso}
      snapshotFrequenciaEm={snapshotFrequenciaEm}
      geografiaGa4={geografiaGa4}
    />
  );
}
