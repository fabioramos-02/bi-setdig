"use client";

import { useState } from "react";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { Select } from "@/components/dashboard/Select";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import {
  alcanceDosDonos,
  perfilOrgao,
  rankingCompartilhados,
  resumoCompartilhamento,
  rotuloSistema,
  type DadosInventario,
} from "@/lib/inventario-sistemas";
import { Aviso, Bloco, Chips, ListaSistemas, corTexto } from "./Comuns";

/** Compartilhamento: quais sistemas servem a vários órgãos e quais órgãos
 * sustentam soluções usadas pelos outros. Explorador em listas, não em grafo
 * (rede com 200 nós não se lê). */
export function CompartilhamentoTab({
  dados,
  onAbrir,
  onVerOrgao,
}: {
  dados: DadosInventario;
  onAbrir: (id: string) => void;
  onVerOrgao: (sigla: string) => void;
}) {
  const r = resumoCompartilhamento(dados.sistemas);
  const ranking = rankingCompartilhados(dados.sistemas, 15);
  const donos = alcanceDosDonos(dados.sistemas).slice(0, 10);
  const compartilhados = rankingCompartilhados(dados.sistemas, Infinity);

  const [sistemaId, setSistemaId] = useState(ranking[0]?.id ?? "");
  const [orgao, setOrgao] = useState("");
  const sistema = dados.sistemas.find((s) => s.id === sistemaId) ?? null;
  const orgaosUsuarios = [...new Set(dados.sistemas.flatMap((s) => s.orgaosQueUsam))].sort();
  const perfil = orgao ? perfilOrgao(orgao, dados) : null;

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={r.anchor}
        comoLer="Conta quantos órgãos diferentes declararam usar o sistema de outro órgão no próprio inventário. É uma medida de alcance, não de importância: um sistema usado por poucos pode ser mais crítico que um usado por muitos."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <DashboardSection title="Quais sistemas são usados por mais órgãos?">
            <RankingBarChart
              itens={ranking.map((s) => ({ label: rotuloSistema(s), valor: s.nOrgaosQueUsam, sublabel: s.orgaoResponsavel }))}
              onSelect={(it) => {
                const s = ranking.find((x) => rotuloSistema(x) === it.label);
                if (s) onAbrir(s.id);
              }}
            />
            <p className="bi-body-small mt-4" style={{ color: corTexto.secundario }}>
              Número de órgãos que declararam usar o sistema; ao lado do nome, o órgão responsável. Clique para abrir a ficha.
            </p>
          </DashboardSection>
        </div>
        <div className="min-w-0">
          <DashboardSection title="Quais órgãos sustentam sistemas usados pelos outros?">
            <RankingBarChart
              itens={donos.map((d) => ({ label: d.sigla, valor: d.orgaos, sublabel: `${d.sistemas} ${d.sistemas === 1 ? "sistema" : "sistemas"}` }))}
              onSelect={(it) => onVerOrgao(it.label)}
            />
            <p className="bi-body-small mt-4" style={{ color: corTexto.secundario }}>
              Número de órgãos diferentes que usam ao menos um sistema do órgão; ao lado, quantos sistemas dele são usados por outros. Uma falha nesses sistemas afeta vários órgãos ao mesmo tempo.
            </p>
          </DashboardSection>
        </div>
      </div>

      <DashboardSection title="Explorar relações entre sistemas e órgãos">
        <div className="grid gap-4 lg:grid-cols-2">
          <Bloco titulo="Quem usa este sistema?" explica={`Escolha um dos ${compartilhados.length} sistemas usados por mais de um órgão.`}>
            <div className="mb-3">
              <Select
                label="Sistema"
                value={sistemaId}
                onChange={setSistemaId}
                opcoes={compartilhados.map((s) => ({ value: s.id, label: `${rotuloSistema(s)} · ${s.orgaoResponsavel}` }))}
                todosLabel="Escolha um sistema"
                maxWidth={520}
              />
            </div>
            {sistema && (
              <>
                <p className="bi-body-small mb-2" style={{ color: corTexto.primario }}>
                  Responsável: <strong>{sistema.orgaoResponsavel}</strong> · usado por {sistema.nOrgaosQueUsam} órgãos
                </p>
                <Chips itens={sistema.orgaosQueUsam} vazio="Nenhum órgão declarou uso." />
                <button type="button" className="bi-label underline mt-3" style={{ color: "var(--ds-color-primary-600)" }} onClick={() => onAbrir(sistema.id)}>
                  Ver ficha do sistema
                </button>
              </>
            )}
          </Bloco>
          <Bloco titulo="De quais sistemas este órgão depende?" explica="Escolha um órgão para ver os sistemas de outros órgãos que ele declarou usar.">
            <div className="mb-3">
              <Select label="Órgão" value={orgao} onChange={setOrgao} opcoes={orgaosUsuarios.map((o) => ({ value: o, label: o }))} todosLabel="Escolha um órgão" />
            </div>
            {perfil && (
              <ListaSistemas
                sistemas={perfil.usaDeOutros}
                onAbrir={onAbrir}
                detalhe={(s) => s.orgaoResponsavel}
                vazio="Este órgão não declarou usar sistemas de outros órgãos."
              />
            )}
          </Bloco>
        </div>
      </DashboardSection>

      <Aviso>
        <strong>Uso não é integração.</strong> Estes dados mostram que um órgão declarou usar o sistema de outro.
        Eles não mostram se os sistemas trocam dados entre si. Para mapear integrações técnicas, o inventário
        precisa de uma pergunta específica sobre isso.
      </Aviso>
    </div>
  );
}
