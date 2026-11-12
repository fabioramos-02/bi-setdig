"use client";

import { useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { atrasadas, ehEntrega, fmtNum, FRENTES, NAO_IDENTIFICADO, type Frente, type TfsItem, type TfsSprint } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { cinza } from "./comum";

type Linha = { pessoa: string; abertos: Record<Frente, TfsItem[]>; total: number; concluidos: number; atrasados: number };
const SEM = "Sem responsável";
const LIMITE = 10;
const ROTULO_FRENTE: Record<Frente, string> = { "X-VIA": "Abertos X-VIA", SGD: "Abertos SGD", "Não identificado": "Sem frente" };

/** Número clicável que abre os itens; zero fica cinza, sem botão. */
const numero = (pessoa: string, frente: Frente, lista: TfsItem[]) =>
  lista.length ? (
    <OrigemBotao rotulo={fmtNum(lista.length)} origem={{
      rotulo: `${pessoa}: itens abertos ${frente === NAO_IDENTIFICADO ? "sem frente" : `da frente ${frente}`}`,
      detalhe: "Entregas e tarefas abertas com esta pessoa como responsável no TFS. A frente vem do item (contrato ou área), não da pessoa.",
      itens: lista, agruparPor: "coluna",
    }} />
  ) : <span style={cinza}>0</span>;

const colunas: Coluna<Linha>[] = [
  { key: "pessoa", label: "Responsável", sortable: true, sortValue: (r) => r.pessoa, render: (r) => (r.pessoa === SEM ? <b>{r.pessoa}</b> : r.pessoa) },
  ...FRENTES.map((f): Coluna<Linha> => ({
    key: f, label: ROTULO_FRENTE[f], align: "right", sortable: true, sortValue: (r) => r.abertos[f].length, render: (r) => numero(r.pessoa, f, r.abertos[f]),
  })),
  { key: "atrasados", label: "Atrasados", align: "right", sortable: true, sortValue: (r) => r.atrasados, render: (r) => (r.atrasados ? fmtNum(r.atrasados) : <span style={cinza}>0</span>) },
  { key: "concluidos", label: "Concluídos", align: "right", sortable: true, sortValue: (r) => r.concluidos, render: (r) => fmtNum(r.concluidos) },
];

/** Nível 3, E — quem responde pelo quê. Uma linha por pessoa (antes era pessoa × frente, e a
 * mesma pessoa aparecia até três vezes); as colunas mostram em que frente estão os itens dela.
 * A frente vem do contrato/área do item (ADR-017), nunca do nome da pessoa. */
export function EquipesTab({ itens, sprints, hoje, children }: { itens: TfsItem[]; sprints: TfsSprint[]; hoje: string; children?: React.ReactNode }) {
  const [todos, setTodos] = useState(false);
  const vivos = itens.filter((i) => i.estado !== "Removed" && (ehEntrega(i) || i.tipo === "Task"));
  const atraso = new Set(atrasadas(itens, sprints, hoje).map((i) => i.id));
  const mapa = new Map<string, Linha>();
  for (const i of vivos) {
    const pessoa = i.responsavel ?? SEM;
    const l = mapa.get(pessoa) ?? { pessoa, abertos: { "X-VIA": [], SGD: [], "Não identificado": [] }, total: 0, concluidos: 0, atrasados: 0 };
    if (i.estado === "Done") l.concluidos += 1;
    else { l.abertos[i.frente].push(i); l.total += 1; }
    if (atraso.has(i.id)) l.atrasados += 1;
    mapa.set(pessoa, l);
  }
  // "Sem responsável" sempre no topo: é o que pede ação. Depois, quem tem mais itens abertos.
  const linhas = [...mapa.values()].sort((a, b) => (a.pessoa === SEM ? -1 : b.pessoa === SEM ? 1 : b.total - a.total || a.pessoa.localeCompare(b.pessoa, "pt-BR")));
  const abertosDe = (f: Frente) => vivos.filter((i) => i.frente === f && i.estado !== "Done");
  const ni = abertosDe(NAO_IDENTIFICADO);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {FRENTES.map((f) => {
          const lista = abertosDe(f);
          return (
            <div key={f} style={{ border: "1px solid var(--ds-color-border)", borderTop: `3px solid ${f === NAO_IDENTIFICADO && lista.length ? "var(--ds-color-warning, #d97706)" : "var(--ds-color-primary-600)"}`, borderRadius: "var(--ds-radius-md)", padding: "8px 12px", background: "var(--ds-color-background)" }}>
              <div className="bi-caption" style={cinza}>{f === NAO_IDENTIFICADO ? "Sem frente identificada" : `Frente ${f}`}</div>
              <div className="text-xl font-semibold tabular-nums">
                {lista.length ? <OrigemBotao rotulo={fmtNum(lista.length)} origem={{ rotulo: `Itens abertos ${f === NAO_IDENTIFICADO ? "sem frente" : `da frente ${f}`}`, detalhe: f === NAO_IDENTIFICADO ? "Sem contrato marcado e fora das áreas da X-VIA e da SGD: ficam fora de todo total da X-VIA até alguém marcar o contrato no TFS." : "Entregas e tarefas abertas desta frente.", itens: lista, agruparPor: "epico" }} /> : "0"}
              </div>
              <div className="bi-caption" style={cinza}>itens abertos</div>
            </div>
          );
        })}
      </div>
      {ni.length > 0 && <p className="bi-caption -mt-2" style={cinza}>Os itens sem frente ficam fora de todo total da X-VIA até alguém marcar o contrato na tarefa.</p>}

      <DashboardSection title="Quem responde pelos itens abertos">
        <div className="overflow-x-auto min-w-0 [&_td]:!py-1.5 [&_th]:!py-1.5">
          <DataTable horizontalScroll pageSize={todos ? undefined : LIMITE} label="Pessoas" searchText={(r) => r.pessoa} columns={colunas} rows={linhas} rowKey={(r) => r.pessoa} />
        </div>
        {linhas.length > LIMITE && (
          <button type="button" onClick={() => setTodos(!todos)} className="mt-2 bi-body underline" style={{ color: "var(--ds-color-primary-600)" }}>
            {todos ? "Mostrar só os 10 primeiros" : `Ver todos (${fmtNum(linhas.length)})`}
          </button>
        )}
        <details className="mt-3 bi-caption" style={cinza}>
          <summary className="cursor-pointer">Como ler</summary>
          <p className="mt-1">Uma linha por pessoa. A frente é do item, não da pessoa: tarefa com o contrato da X-VIA (ou na área que a X-VIA fatura) é X-VIA; com o contrato do Governo do Estado ou na área da SGD é SGD; entrega com [SGD] no título ou no épico da SGD também é SGD. Por isso alguém da SGD pode ter itens na coluna X-VIA, e vice-versa. Clique no número para ver os itens.</p>
        </details>
      </DashboardSection>

      {children && (
        <details style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", padding: "10px 14px", background: "var(--ds-color-background)" }}>
          <summary className="cursor-pointer bi-body font-semibold">Quadro do time no TFS</summary>
          <div className="mt-3">{children}</div>
        </details>
      )}
    </div>
  );
}
