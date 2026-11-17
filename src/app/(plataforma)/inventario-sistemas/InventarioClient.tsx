"use client";

import { useState } from "react";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { rankingResponsabilidade, type DadosInventario } from "@/lib/inventario-sistemas";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { PorOrgaoTab } from "./PorOrgaoTab";
import { CompartilhamentoTab } from "./CompartilhamentoTab";
import { CriticidadeTab } from "./CriticidadeTab";
import { QualidadeTab } from "./QualidadeTab";
import { CatalogoTab } from "./CatalogoTab";
import { FichaSistema } from "./FichaSistema";

/** Estado compartilhado entre as abas: aba ativa, órgão escolhido e sistema
 * com a ficha aberta (a ficha abre de qualquer aba). */
export function InventarioClient({ dados }: { dados: DadosInventario }) {
  const [aba, setAba] = useState("visao-geral");
  const [orgao, setOrgao] = useState(rankingResponsabilidade(dados.sistemas)[0]?.sigla ?? "");
  const [aberto, setAberto] = useState<string | null>(null);

  const verOrgao = (sigla: string) => {
    setOrgao(sigla);
    setAba("por-orgao");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const abas: TabItem[] = [
    { id: "visao-geral", label: "1. Visão Geral", content: <VisaoGeralTab dados={dados} onVerOrgao={verOrgao} /> },
    { id: "por-orgao", label: "2. Por órgão", content: <PorOrgaoTab dados={dados} orgao={orgao} onOrgao={setOrgao} onAbrir={setAberto} /> },
    { id: "compartilhamento", label: "3. Compartilhamento", content: <CompartilhamentoTab dados={dados} onAbrir={setAberto} onVerOrgao={verOrgao} /> },
    { id: "criticidade", label: "4. Criticidade", content: <CriticidadeTab dados={dados} onAbrir={setAberto} /> },
    { id: "qualidade", label: "5. Qualidade do inventário", content: <QualidadeTab dados={dados} onAbrir={setAberto} /> },
    { id: "catalogo", label: "6. Catálogo de sistemas", content: <CatalogoTab dados={dados} onAbrir={setAberto} /> },
  ];

  return (
    <>
      <Tabs items={abas} ativa={aba} onAtivaChange={setAba} />
      <FichaSistema
        sistema={dados.sistemas.find((s) => s.id === aberto) ?? null}
        pendencias={dados.pendencias}
        indicacoes={dados.indicacoes}
        meta={dados.meta}
        onClose={() => setAberto(null)}
      />
    </>
  );
}
