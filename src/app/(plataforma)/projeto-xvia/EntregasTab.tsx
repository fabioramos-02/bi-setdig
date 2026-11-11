import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { ehEntrega, fmtData, fmtNum, linkTfs, quemResolve, type TfsItem } from "@/lib/tfs";
import { LinkItem, cinza } from "./comum";

const nomeSprint = (s: string) => (s.includes("\\") ? s.split("\\").pop()! : "Sem sprint");

const colunas: Coluna<TfsItem>[] = [
  { key: "titulo", label: "Entrega", sortable: true, sortValue: (r) => r.titulo, render: (r) => <LinkItem item={r} /> },
  { key: "frente", label: "Frente", sortable: true, sortValue: (r) => r.frente, render: (r) => r.frente },
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico ?? "", render: (r) => r.epico ?? "—" },
  { key: "feature", label: "Feature", sortable: true, sortValue: (r) => r.feature ?? "", render: (r) => r.feature ?? "—" },
  { key: "sprint", label: "Sprint", sortable: true, sortValue: (r) => r.sprint, render: (r) => nomeSprint(r.sprint) },
  { key: "coluna", label: "Situação", sortable: true, sortValue: (r) => r.coluna ?? r.estado, render: (r) => r.coluna ?? r.estado },
  { key: "resp", label: "Responsável", sortable: true, sortValue: (r) => quemResolve(r), render: (r) => quemResolve(r) },
  { key: "prazo", label: "Prazo", sortable: true, sortValue: (r) => r.prazo ?? "", render: (r) => fmtData(r.prazo) },
  { key: "dep", label: "Depende de", render: (r) => (r.dependeDe?.length ? r.dependeDe.map((d) => `#${d}`).join(", ") : "—") },
  { key: "alt", label: "Última alteração", sortable: true, sortValue: (r) => r.alteradoEm ?? "", render: (r) => fmtData(r.alteradoEm) },
];

/** Nível 3, C — todas as entregas (PBI e Bug), com frente, prazo, responsável e dependência. */
export function EntregasTab({ itens }: { itens: TfsItem[] }) {
  const entregas = itens.filter((i) => ehEntrega(i) && i.estado !== "Removed");
  return (
    <DashboardSection
      title={`Entregas (${fmtNum(entregas.length)})`}
      action={<ExportCsvButton filename="projeto-xvia-entregas.csv" rows={entregas.map((e) => ({ id: e.id, entrega: e.titulo, frente: e.frente, modulo: e.epico ?? "", feature: e.feature ?? "", sprint: nomeSprint(e.sprint), situacao: e.coluna ?? e.estado, responsavel: quemResolve(e), prazo: e.prazo ?? "", dependeDe: (e.dependeDe ?? []).join(" "), alteradoEm: e.alteradoEm ?? "", link: linkTfs(e.id) }))} />}
    >
      <p className="mb-3 text-xs" style={cinza}>Histórico de alterações: o painel guarda só a data da última alteração; o histórico completo fica no próprio item do TFS (link).</p>
      <div className="overflow-x-auto min-w-0"><DataTable columns={colunas} rows={entregas} rowKey={(r) => String(r.id)} /></div>
    </DashboardSection>
  );
}
