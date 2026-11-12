import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { fmtNum, linkTfs, quemResolve, type Frente, type TfsItem, type TfsSprint } from "@/lib/tfs";
import { LinkItem } from "./comum";

import { linhasPrioridades, type LinhaPrioridade as Linha } from "@/lib/xvia-prioridades";

const colunas: Coluna<Linha>[] = [
  { key: "titulo", label: "Entrega", sortable: true, sortValue: (r) => r.titulo, render: (r) => <LinkItem item={r} /> },
  { key: "motivo", label: "Problema", sortable: true, sortValue: (r) => r.motivo, render: (r) => r.motivo },
  { key: "acao", label: "Ação necessária", render: (r) => <b>{r.acao}</b> },
  { key: "quem", label: "Responsável no TFS", sortable: true, sortValue: (r) => quemResolve(r), render: (r) => quemResolve(r) },
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico ?? "", render: (r) => r.epico ?? "—" },
  { key: "dias", label: "Dias sem atualização", align: "right", sortable: true, sortValue: (r) => r.diasSemAtualizar ?? 0, render: (r) => r.diasSemAtualizar === null ? "Não informado" : fmtNum(r.diasSemAtualizar) },
];

const csv = (ls: Linha[]) => ls.map((l) => ({ id: l.id, entrega: l.titulo, problema: l.motivo, acao: l.acao, responsavelNoRegistro: l.responsavel ?? "", modulo: l.epico ?? "", diasSemAtualizacao: l.diasSemAtualizar ?? "", link: linkTfs(l.id) }));

/** Nível 2, primeira tela — onde o gerente precisa agir hoje. X-VIA e SGD em blocos
 * separados: o que é da contratada nunca se mistura com o que é do Estado. */
export function PrioridadesTab({ itens, sprints, hoje }: { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string }) {
  const da = (f: Frente) => linhasPrioridades(itens.filter((i) => i.frente === f), sprints, hoje);
  const xv = da("X-VIA");
  const sgd = da("SGD");
  const decidir = xv.filter((l) => l.acao === "Decidir").length;
  const bloco = (titulo: string, ls: Linha[], arquivo: string, vazio: string) => (
    <DashboardSection title={`${titulo} (${fmtNum(ls.length)})`} action={ls.length ? <ExportCsvButton filename={arquivo} rows={csv(ls)} /> : undefined}>
      {ls.length === 0 ? <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>{vazio}</p> : (
        <div className="overflow-x-auto min-w-0"><DataTable horizontalScroll pageSize={25} label="Entregas" rowId={(r) => `prioridade-${r.id}`} searchText={(r) => [r.id, r.titulo, r.motivo, r.acao, r.responsavel, r.epico].join(" ")} columns={colunas} rows={ls} rowKey={(r) => String(r.id)} /></div>
      )}
    </DashboardSection>
  );

  return (
    <div id="decisoes-pendentes" tabIndex={-1} className="flex flex-col gap-6">
      <StoryCard
        anchor={xv.length ? `${fmtNum(xv.length)} entregas da X-VIA pedem ação: ${fmtNum(decidir)} esperam decisão.` : "Nenhuma entrega da X-VIA está parada ou atrasada."}
        caption={sgd.length ? `Do lado da SGD, ${fmtNum(sgd.length)} itens próprios também estão parados ou atrasados.` : undefined}
        comoLer="Entra a entrega aberta que aguarda decisão, está impedida, tem dependência registrada ou passou da sprint ou do prazo. Decisões aparecem primeiro; depois, os itens há mais tempo sem atualização. O responsável no registro pode acompanhar a demanda sem ser quem executa ou decide."
      />
      {bloco("Entregas da X-VIA", xv, "projeto-xvia-prioridades-xvia.csv", "Nada parado ou atrasado na X-VIA.")}
      {bloco("Itens da SGD (Estado)", sgd, "projeto-xvia-prioridades-sgd.csv", "Nada parado ou atrasado na SGD.")}
    </div>
  );
}
