import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { atrasadas, fmtData, fmtNum, linkTfs, pendencias, quemResolve, type Frente, type TfsItem, type TfsSprint } from "@/lib/tfs";
import { LinkItem } from "./comum";

type Linha = TfsItem & { motivo: string; acao: string };

/** Motivo e ação de cada entrega parada — o gerente vê o problema e o que fazer. */
function linhas(itens: TfsItem[], sprints: TfsSprint[], hoje: string): Linha[] {
  const atraso = new Set(atrasadas(itens, sprints, hoje).map((i) => i.id));
  const mapa = new Map<number, Linha>();
  for (const i of pendencias(itens)) {
    const [motivo, acao] = i.coluna === "Aguardando decisão" ? ["Aguardando decisão", "Decidir"]
      : i.coluna === "Impedido" ? ["Impedido", "Remover o impedimento"] : ["Dependência", "Resolver a dependência"];
    mapa.set(i.id, { ...i, motivo: atraso.has(i.id) ? `${motivo} e atrasada` : motivo, acao });
  }
  for (const i of atrasadas(itens, sprints, hoje))
    if (!mapa.has(i.id)) mapa.set(i.id, { ...i, motivo: i.prazo && i.prazo < hoje ? `Prazo venceu em ${fmtData(i.prazo)}` : "Sprint já encerrou", acao: "Replanejar ou concluir" });
  const peso = (l: Linha) => (l.motivo.startsWith("Aguardando") ? 0 : l.motivo.startsWith("Impedido") ? 1 : 2);
  return [...mapa.values()].sort((a, b) => peso(a) - peso(b) || (b.diasSemAtualizar ?? 0) - (a.diasSemAtualizar ?? 0));
}

const colunas: Coluna<Linha>[] = [
  { key: "titulo", label: "Entrega", sortable: true, sortValue: (r) => r.titulo, render: (r) => <LinkItem item={r} /> },
  { key: "motivo", label: "Problema", sortable: true, sortValue: (r) => r.motivo, render: (r) => r.motivo },
  { key: "acao", label: "Ação necessária", render: (r) => <b>{r.acao}</b> },
  { key: "quem", label: "Quem resolve", sortable: true, sortValue: (r) => quemResolve(r), render: (r) => quemResolve(r) },
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico ?? "", render: (r) => r.epico ?? "—" },
  { key: "dias", label: "Dias parada", align: "right", sortable: true, sortValue: (r) => r.diasSemAtualizar ?? 0, render: (r) => fmtNum(r.diasSemAtualizar ?? 0) },
];

const csv = (ls: Linha[]) => ls.map((l) => ({ id: l.id, entrega: l.titulo, problema: l.motivo, acao: l.acao, quemResolve: quemResolve(l), modulo: l.epico ?? "", diasParada: l.diasSemAtualizar ?? 0, link: linkTfs(l.id) }));

/** Nível 2, primeira tela — onde o gerente precisa agir hoje. X-VIA e SGD em blocos
 * separados: o que é da contratada nunca se mistura com o que é do Estado. */
export function PrioridadesTab({ itens, sprints, hoje }: { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string }) {
  const da = (f: Frente) => linhas(itens.filter((i) => i.frente === f), sprints, hoje);
  const xv = da("X-VIA");
  const sgd = da("SGD");
  const decidir = xv.filter((l) => l.acao === "Decidir").length;
  const bloco = (titulo: string, ls: Linha[], arquivo: string, vazio: string) => (
    <DashboardSection title={`${titulo} (${fmtNum(ls.length)})`} action={ls.length ? <ExportCsvButton filename={arquivo} rows={csv(ls)} /> : undefined}>
      {ls.length === 0 ? <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>{vazio}</p> : (
        <div className="overflow-x-auto min-w-0"><DataTable columns={colunas} rows={ls} rowKey={(r) => String(r.id)} /></div>
      )}
    </DashboardSection>
  );

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={xv.length ? `${fmtNum(xv.length)} entregas da X-VIA pedem ação: ${fmtNum(decidir)} esperam decisão.` : "Nenhuma entrega da X-VIA está parada ou atrasada."}
        caption={sgd.length ? `Do lado da SGD, ${fmtNum(sgd.length)} itens próprios também estão parados ou atrasados.` : undefined}
        comoLer="Entra a entrega aberta que aguarda decisão, está impedida, tem dependência registrada ou passou da sprint ou do prazo. Decisões aparecem primeiro; depois, as mais paradas. 'Quem resolve' é o responsável no TFS."
      />
      {bloco("Entregas da X-VIA", xv, "projeto-xvia-prioridades-xvia.csv", "Nada parado ou atrasado na X-VIA.")}
      {bloco("Itens da SGD (Estado)", sgd, "projeto-xvia-prioridades-sgd.csv", "Nada parado ou atrasado na SGD.")}
    </div>
  );
}
