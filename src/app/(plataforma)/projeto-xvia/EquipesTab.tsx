import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { atrasadas, ehEntrega, fmtNum, FRENTES, NAO_IDENTIFICADO, type Frente, type TfsItem, type TfsSprint } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { cinza } from "./comum";

type Linha = { pessoa: string; frente: Frente; abertos: TfsItem[]; concluidos: number; atrasados: number };

const colunas: Coluna<Linha>[] = [
  { key: "pessoa", label: "Responsável", sortable: true, sortValue: (r) => r.pessoa, render: (r) => r.pessoa },
  { key: "frente", label: "Frente", sortable: true, sortValue: (r) => r.frente, render: (r) => r.frente },
  { key: "abertos", label: "Itens abertos", align: "right", render: (r) => <OrigemBotao origem={{ rotulo: `Itens abertos de ${r.pessoa}`, detalhe: "Entregas e tarefas abertas com esta pessoa como responsável no TFS.", itens: r.abertos }} /> },
  { key: "n", label: "Qtd. abertos", align: "right", sortable: true, sortValue: (r) => r.abertos.length, render: (r) => fmtNum(r.abertos.length) },
  { key: "atrasados", label: "Entregas atrasadas", align: "right", sortable: true, sortValue: (r) => r.atrasados, render: (r) => fmtNum(r.atrasados) },
  { key: "concluidos", label: "Concluídos", align: "right", sortable: true, sortValue: (r) => r.concluidos, render: (r) => fmtNum(r.concluidos) },
];

/** Nível 3, E — quem responde pelo quê, com X-VIA, SGD e Não identificado sempre separados.
 * A frente vem do contrato/área (ADR-017), nunca do nome da pessoa. */
export function EquipesTab({ itens, sprints, hoje, children }: { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string; children?: React.ReactNode }) {
  const vivos = itens.filter((i) => i.estado !== "Removed" && (ehEntrega(i) || i.tipo === "Task"));
  const atraso = new Set(atrasadas(itens, sprints, hoje).map((i) => i.id));
  const mapa = new Map<string, Linha>();
  for (const i of vivos) {
    const pessoa = i.responsavel ?? "Sem responsável";
    const k = `${i.frente}|${pessoa}`;
    const l = mapa.get(k) ?? { pessoa, frente: i.frente, abertos: [], concluidos: 0, atrasados: 0 };
    if (i.estado === "Done") l.concluidos += 1;
    else l.abertos.push(i);
    if (atraso.has(i.id)) l.atrasados += 1;
    mapa.set(k, l);
  }
  const linhas = [...mapa.values()].sort((a, b) => FRENTES.indexOf(a.frente) - FRENTES.indexOf(b.frente) || b.abertos.length - a.abertos.length);
  const conta = (f: Frente) => vivos.filter((i) => i.frente === f).length;
  const ni = vivos.filter((i) => i.frente === NAO_IDENTIFICADO);

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`X-VIA: ${fmtNum(conta("X-VIA"))} itens · SGD: ${fmtNum(conta("SGD"))} itens · sem frente identificada: ${fmtNum(ni.length)}.`}
        caption={ni.length ? "Os itens sem frente não entram em nenhum total da X-VIA até alguém marcar o contrato na tarefa." : undefined}
        comoLer="Tarefa é da X-VIA quando tem o contrato da X-VIA marcado (ou está na área que a X-VIA fatura); é da SGD quando tem o contrato do Governo do Estado ou está na área da SGD. Entrega (PBI) é da SGD quando está na área da SGD, tem [SGD] no título ou está no épico da SGD."
      />
      {ni.length > 0 && (
        <DashboardSection title={`Sem frente identificada (${fmtNum(ni.length)})`} action={<OrigemBotao origem={{ rotulo: "Tarefas sem frente identificada", detalhe: "Sem contrato marcado e fora das áreas da X-VIA e da SGD. Marcar o contrato no TFS resolve.", itens: ni }} />}>
          <p className="text-sm" style={cinza}>Marcar o contrato (X-VIA ou Governo do Estado) na tarefa, no TFS. Até lá ficam fora de UST, faturamento e entregas.</p>
        </DashboardSection>
      )}
      <DashboardSection title="Responsáveis por frente">
        <div className="overflow-x-auto min-w-0"><DataTable columns={colunas} rows={linhas} rowKey={(r) => `${r.frente}|${r.pessoa}`} /></div>
      </DashboardSection>
      {children}
    </div>
  );
}
