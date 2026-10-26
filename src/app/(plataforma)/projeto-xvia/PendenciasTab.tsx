import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { fmtNum, linkTfs, pendencias, type TfsItem } from "@/lib/tfs";

const colunas: Coluna<TfsItem>[] = [
  {
    key: "titulo", label: "Entrega", sortable: true, sortValue: (r) => r.titulo,
    render: (r) => (
      <a href={linkTfs(r.id)} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>
        #{r.id} {r.titulo}
      </a>
    ),
  },
  { key: "situacao", label: "Situação", sortable: true, sortValue: (r) => r.coluna ?? "", render: (r) => r.coluna ?? r.estado },
  { key: "feature", label: "Feature", sortable: true, sortValue: (r) => r.feature ?? "", render: (r) => r.feature ?? "—" },
  { key: "epico", label: "Épico", sortable: true, sortValue: (r) => r.epico ?? "", render: (r) => r.epico ?? "—" },
  { key: "orgao", label: "Órgão", sortable: true, sortValue: (r) => r.orgao ?? "", render: (r) => r.orgao ?? "—" },
  {
    key: "dias", label: "Dias sem atualizar", align: "right", sortable: true,
    sortValue: (r) => r.diasSemAtualizar ?? 0, render: (r) => fmtNum(r.diasSemAtualizar ?? 0),
  },
];

/** Pendências e problemas: entregas em Aguardando decisão ou Impedido, ou com
 * dependência registrada, ligadas à Feature e ao épico. As mais paradas primeiro. */
export function PendenciasTab({ itens }: { itens: TfsItem[] }) {
  const lista = pendencias(itens);
  const porEpico = new Map<string, number>();
  for (const p of lista) porEpico.set(p.epico ?? "Sem épico", (porEpico.get(p.epico ?? "Sem épico") ?? 0) + 1);
  const ranking = [...porEpico].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);

  if (lista.length === 0) {
    return <StoryCard anchor="Nenhuma entrega está aguardando decisão ou impedida hoje." comoLer="Pendência é a entrega na coluna Aguardando decisão ou Impedido, ou com a etiqueta Dependência no TFS." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`${fmtNum(lista.length)} entregas estão paradas esperando decisão, outro órgão ou um impedimento ser resolvido.`}
        caption={ranking[0] ? `${ranking[0].label} concentra ${fmtNum(ranking[0].valor)} delas.` : undefined}
        comoLer="Pendência é a entrega na coluna Aguardando decisão ou Impedido, ou com a etiqueta Dependência no TFS. Dias sem atualizar contam desde a última alteração do item."
      />

      <DashboardSection title="Em quais módulos estão as pendências?">
        <RankingBarChart itens={ranking} cor="var(--ds-color-danger)" />
      </DashboardSection>

      <DashboardSection
        title="Quais entregas estão paradas?"
        action={
          <ExportCsvButton
            filename="projeto-xvia-pendencias.csv"
            rows={lista.map((p) => ({
              id: p.id, entrega: p.titulo, situacao: p.coluna ?? p.estado, feature: p.feature ?? "",
              epico: p.epico ?? "", orgao: p.orgao ?? "", diasSemAtualizar: p.diasSemAtualizar ?? 0, link: linkTfs(p.id),
            }))}
          />
        }
      >
        <div className="overflow-x-auto min-w-0">
          <DataTable columns={colunas} rows={lista} rowKey={(r) => String(r.id)} />
        </div>
      </DashboardSection>
    </div>
  );
}
