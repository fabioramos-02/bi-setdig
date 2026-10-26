import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { fmtNum, stakeholdersDoProjeto, type LinhaStakeholder, type TfsItem, type TfsStakeholder } from "@/lib/tfs";

const PAPEL = { piloto: "Órgão piloto", parceiro: "Órgão parceiro" } as const;

const colunas: Coluna<LinhaStakeholder>[] = [
  { key: "sigla", label: "Órgão", sortable: true, sortValue: (r) => r.sigla, render: (r) => <span title={r.nome}>{r.sigla}</span> },
  { key: "papel", label: "Papel", sortable: true, sortValue: (r) => r.papel ?? "", render: (r) => (r.papel ? PAPEL[r.papel] : "a definir") },
  { key: "ponto", label: "Ponto focal", sortable: true, sortValue: (r) => r.pontoFocal ?? "", render: (r) => r.pontoFocal ?? "a definir" },
  { key: "contato", label: "Contato", render: (r) => r.contato ?? "—" },
  { key: "secretario", label: "Dirigente", sortable: true, sortValue: (r) => r.secretario ?? "", render: (r) => r.secretario ?? "—" },
  { key: "modulos", label: "Módulos", render: (r) => r.modulosNoTfs.join(", ") || "—" },
  { key: "itens", label: "Entregas", align: "right", sortable: true, sortValue: (r) => r.itens, render: (r) => fmtNum(r.itens) },
];

/** Órgãos envolvidos: os que têm entregas no backlog (pelo prefixo da Feature,
 * ex. [SES]) ou papel definido. Ponto focal e papel piloto/parceiro são
 * preenchidos à mão em datasets/tfs/v1/stakeholders.json. */
export function StakeholdersTab({ itens, stakeholders }: { itens: TfsItem[]; stakeholders: TfsStakeholder[] }) {
  const linhas = stakeholdersDoProjeto(stakeholders, itens);
  const pilotos = linhas.filter((l) => l.papel === "piloto").length;
  const parceiros = linhas.filter((l) => l.papel === "parceiro").length;
  const semPonto = linhas.filter((l) => !l.pontoFocal).length;

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`${fmtNum(linhas.length)} órgãos têm entregas no projeto X-VIA: ${fmtNum(pilotos)} pilotos e ${fmtNum(parceiros)} parceiros definidos até agora.`}
        caption={semPonto > 0 ? `${fmtNum(semPonto)} ainda estão sem ponto focal registrado.` : undefined}
        comoLer="O órgão de cada entrega vem do prefixo da Feature no TFS (ex.: [SES] - Saúde). Papel e ponto focal são levantados pela SGD."
      />

      <DashboardSection
        title="Quem são os órgãos e os pontos focais do projeto?"
        action={
          <ExportCsvButton
            filename="projeto-xvia-orgaos.csv"
            rows={linhas.map((l) => ({
              sigla: l.sigla, orgao: l.nome, papel: l.papel ?? "", pontoFocal: l.pontoFocal ?? "",
              contato: l.contato ?? "", dirigente: l.secretario ?? "", modulos: l.modulosNoTfs.join(", "), entregas: l.itens,
            }))}
          />
        }
      >
        <div className="overflow-x-auto min-w-0">
          <DataTable columns={colunas} rows={linhas} rowKey={(r) => r.sigla} />
        </div>
      </DashboardSection>
    </div>
  );
}
