"use client";

import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { completudeCampos, panoramaInventario, type DadosInventario, type Pendencia } from "@/lib/inventario-sistemas";
import { BarraPercentual, Chips, corTexto } from "./Comuns";

/** Qualidade do inventário: o que está preenchido, o que falta validar e
 * quem ainda não respondeu. Preenchido não quer dizer conferido. */
export function QualidadeTab({ dados, onAbrir }: { dados: DadosInventario; onAbrir: (id: string) => void }) {
  const campos = completudeCampos(dados.sistemas);
  const p = panoramaInventario(dados);
  const vazios = campos.filter((c) => c.pct === 0).map((c) => c.rotulo.toLowerCase());
  const cor = (v: number) => (v >= 90 ? "var(--ds-color-success)" : v >= 50 ? "var(--ds-color-warning)" : "var(--ds-color-danger)");

  const colunas: Coluna<Pendencia>[] = [
    { key: "tipo", label: "Tipo", sortable: true, sortValue: (r) => r.tipo, render: (r) => r.tipo },
    {
      key: "item",
      label: "Sistema",
      render: (r) =>
        r.sistemaId ? (
          <button type="button" className="underline text-left" style={{ color: "var(--ds-color-primary-600)" }} onClick={() => onAbrir(r.sistemaId!)}>
            {r.item}
          </button>
        ) : (
          r.item
        ),
    },
    { key: "falta", label: "O que precisa confirmar", render: (r) => r.oQueFalta ?? "" },
    { key: "fontes", label: "Inventários de origem", align: "right", render: (r) => r.fontes.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`Nome e órgão responsável estão preenchidos em praticamente todos os sistemas, mas ${vazios.length ? `${vazios.join(" e ")} ainda não ${vazios.length === 1 ? "foi preenchida" : "foram preenchidos"} em nenhum` : "há campos incompletos"}. Há ${dados.pendencias.length} pendências de validação e ${p.naoEnviaram.length} órgãos que não enviaram inventário.`}
        comoLer="O percentual mostra quantos sistemas têm o campo preenchido, não se a informação foi conferida. Os órgãos que não enviaram inventário têm só os sistemas que outros órgãos citaram."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <DashboardSection title="Quais informações estão completas?">
            <div className="flex flex-col gap-4">
              {campos.map((c) => (
                <BarraPercentual key={c.campo} rotulo={c.rotulo} pct={c.pct} detalhe={`${c.preenchidos} de ${c.total}`} cor={cor(c.pct)} />
              ))}
            </div>
            <p className="bi-caption mt-4" style={{ color: corTexto.apoio }}>
              Verde a partir de 90%, amarelo de 50% a 89%, vermelho abaixo de 50%.
            </p>
          </DashboardSection>
        </div>
        <div className="min-w-0">
          <DashboardSection title="Quem ainda precisa enviar o inventário?">
            <p className="bi-body-small mb-3" style={{ color: corTexto.secundario }}>
              {p.nEnviaram} de {p.nOrgaos} órgãos enviaram ({p.pctEnviaram}%).
            </p>
            <Chips itens={p.naoEnviaram} vazio="Todos os órgãos enviaram." />
          </DashboardSection>
        </div>
      </div>

      <DashboardSection title="O que precisa ser confirmado antes de oficializar o inventário?">
        <DataTable columns={colunas} rows={dados.pendencias} rowKey={(r) => `${r.tipo}-${r.item}`} label="Pendências" />
        <p className="bi-caption mt-3" style={{ color: corTexto.apoio }}>
          Para virar acompanhamento, cada pendência ainda precisa de responsável pela validação, prazo e situação.
        </p>
      </DashboardSection>
    </div>
  );
}
