"use client";

import { StoryCard } from "@/components/dashboard/StoryCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SelectPesquisavel } from "@/components/dashboard/SelectPesquisavel";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { DONO_DESCONHECIDO, perfilOrgao, type DadosInventario } from "@/lib/inventario-sistemas";
import { Bloco, ListaSistemas, corTexto } from "./Comuns";

/** Por órgão: o usuário escolhe o órgão e vê três perspectivas que não se
 * confundem — o que é dele, o que ele usa dos outros e quem usa o que é dele. */
export function PorOrgaoTab({
  dados,
  orgao,
  onOrgao,
  onAbrir,
}: {
  dados: DadosInventario;
  orgao: string;
  onOrgao: (sigla: string) => void;
  onAbrir: (id: string) => void;
}) {
  const opcoes = dados.orgaos
    .filter((o) => o.sigla !== DONO_DESCONHECIDO)
    .map((o) => ({ value: o.sigla, label: o.sigla }));
  const p = perfilOrgao(orgao, dados);
  const n = (v: number) => v.toLocaleString("pt-BR");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <SelectPesquisavel label="Órgão" value={orgao} onChange={onOrgao} opcoes={opcoes} placeholder="Escolha um órgão" />
        {p.orgao && (
          <span
            className="bi-label px-3 py-1 rounded-full"
            style={{
              color: p.orgao.enviouInventario ? "var(--ds-color-success)" : "var(--ds-color-warning)",
              border: `1px solid ${p.orgao.enviouInventario ? "var(--ds-color-success)" : "var(--ds-color-warning)"}`,
            }}
          >
            {p.orgao.enviouInventario ? "Enviou inventário" : "Não enviou inventário"}
          </span>
        )}
      </div>

      <StoryCard
        anchor={p.frase}
        comoLer="Sistemas sob responsabilidade são os que pertencem ao órgão. Sistemas de outros órgãos são os que ele declarou usar no inventário. O alcance mostra quantos órgãos declararam usar algum sistema dele. Uso declarado não é o mesmo que integração técnica entre sistemas."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <MetricCard label="Sistemas sob responsabilidade" value={p.proprios.length} sub="pertencem ao órgão" />
        <MetricCard label="Sistemas de outros órgãos que usa" value={p.usaDeOutros.length} sub={`de ${n(p.dependeDe.length)} órgãos diferentes`} />
        <MetricCard label="Órgãos que usam os sistemas dele" value={p.quemUsaSeus.length} sub="alcance das soluções do órgão" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <Bloco titulo="Quais sistemas pertencem ao órgão?" explica="Sistemas em que este órgão é o responsável. Abaixo de cada um, quantos outros órgãos também o usam.">
          <ListaSistemas
            sistemas={p.proprios}
            onAbrir={onAbrir}
            detalhe={(s) => (s.nOrgaosQueUsam === 0 ? "só o órgão usa" : s.nOrgaosQueUsam === 1 ? "1 outro órgão usa" : `${s.nOrgaosQueUsam} outros órgãos usam`)}
            vazio="Nenhum sistema sob responsabilidade deste órgão."
          />
        </Bloco>
        <Bloco titulo="De quais sistemas de outros órgãos ele depende?" explica="Sistemas que o órgão declarou usar. As barras mostram quantos sistemas vêm de cada órgão responsável.">
          {p.dependeDe.length > 0 && (
            <div className="mb-4">
              <RankingBarChart compact itens={p.dependeDe.slice(0, 6).map((d) => ({ label: d.sigla, valor: d.sistemas }))} />
            </div>
          )}
          <ListaSistemas
            sistemas={p.usaDeOutros}
            onAbrir={onAbrir}
            detalhe={(s) => s.orgaoResponsavel}
            vazio={p.orgao?.enviouInventario === false ? "O órgão não enviou inventário, então não sabemos o que ele usa." : "O órgão não declarou usar sistemas de outros órgãos."}
          />
        </Bloco>
        <Bloco titulo="Quem usa os sistemas deste órgão?" explica="Órgãos que declararam usar ao menos um sistema deste órgão. A barra mostra quantos sistemas dele cada um usa. Clique para ver aquele órgão.">
          {p.quemUsaSeus.length > 0 ? (
            <RankingBarChart
              compact
              itens={p.quemUsaSeus.map((q) => ({ label: q.sigla, valor: q.sistemas }))}
              onSelect={(it) => onOrgao(it.label)}
            />
          ) : (
            <p className="bi-body-small" style={{ color: corTexto.secundario }}>Nenhum outro órgão declarou usar os sistemas deste órgão.</p>
          )}
        </Bloco>
      </div>
    </div>
  );
}
