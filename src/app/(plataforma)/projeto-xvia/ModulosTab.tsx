import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { atrasadas, fmtNum, porModulo, TIPOS_ENTREGA, type Filtros, type LinhaModulo, type TfsItem, type TfsSprint } from "@/lib/tfs";
import type { Filtrar } from "./ProjetoXviaClient";

type Linha = LinhaModulo & { atrasadas: number; dependencias: number };

const colunas: Coluna<Linha>[] = [
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico, render: (r) => r.epico },
  { key: "total", label: "Entregas", align: "right", sortable: true, sortValue: (r) => r.total, render: (r) => fmtNum(r.total) },
  { key: "xvia", label: "Frente X-VIA", align: "right", sortable: true, sortValue: (r) => r.xvia, render: (r) => fmtNum(r.xvia) },
  { key: "sgd", label: "Frente SGD", align: "right", sortable: true, sortValue: (r) => r.sgd, render: (r) => fmtNum(r.sgd) },
  ...TIPOS_ENTREGA.map((t): Coluna<Linha> => ({
    key: t, label: t, align: "right", sortable: true, sortValue: (r) => r.porTipo[t], render: (r) => fmtNum(r.porTipo[t]),
  })),
  { key: "producao", label: "Em produção", align: "right", sortable: true, sortValue: (r) => r.emProducao, render: (r) => fmtNum(r.emProducao) },
  { key: "atrasadas", label: "Atrasadas", align: "right", sortable: true, sortValue: (r) => r.atrasadas, render: (r) => fmtNum(r.atrasadas) },
  { key: "pend", label: "Pendências", align: "right", sortable: true, sortValue: (r) => r.pendencias, render: (r) => fmtNum(r.pendencias) },
  { key: "dep", label: "Dependências ligadas", align: "right", sortable: true, sortValue: (r) => r.dependencias, render: (r) => fmtNum(r.dependencias) },
];

/** Nível 2 — por módulo (épico do TFS): o que é da X-VIA e o que é da SGD,
 * quanto já está em produção, o que atrasou e quantas dependências estão
 * registradas (base do cronograma). */
export function ModulosTab({ itens, sprints, hoje, filtros, filtrar }: {
  itens: TfsItem[]; sprints: TfsSprint[]; hoje: string; filtros: Filtros; filtrar: Filtrar;
}) {
  const atraso = atrasadas(itens, sprints, hoje);
  const modulos: Linha[] = porModulo(itens).map((m) => ({
    ...m,
    atrasadas: atraso.filter((i) => (i.epico ?? "Sem épico") === m.epico).length,
    dependencias: itens.filter((i) => (i.epico ?? "Sem épico") === m.epico && (i.dependeDe?.length ?? 0) > 0).length,
  }));
  const maior = modulos[0];
  const semLinks = !itens.some((i) => i.dependeDe !== undefined);

  return (
    <div className="flex flex-col gap-6">
      {maior && !filtros.modulo && (
        <StoryCard
          anchor={`${maior.epico} é o módulo com mais entregas: ${fmtNum(maior.total)}, sendo ${fmtNum(maior.emProducao)} já em produção e ${fmtNum(maior.atrasadas)} atrasadas.`}
          comoLer={`A frente SGD reúne o que o time da SGD toca (área SGD no TFS); o resto é da X-VIA. Atrasada = entrega aberta cuja sprint já encerrou ou cujo prazo venceu (não muda o estado do item). Dependências ligadas = entregas com link Predecessor no TFS.${semLinks ? " Os links ainda não foram extraídos neste retrato." : ""}`}
        />
      )}

      <DashboardSection title="Quanto de cada módulo já está em produção?">
        <StackedBarChart itens={modulos.map((m) => ({ label: m.epico, atendidos: m.emProducao, pendentes: m.total - m.emProducao }))} />
        <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Verde: entregas em produção. Vermelho: entregas ainda em andamento. Clique numa linha da tabela abaixo para ver só aquele módulo em todas as abas.
        </p>
      </DashboardSection>

      <DashboardSection title="Como está cada módulo?">
        <div className="overflow-x-auto min-w-0">
          <DataTable columns={colunas} rows={modulos} rowKey={(r) => r.epico} onRowClick={(r) => filtrar("modulo", r.epico)} />
        </div>
      </DashboardSection>
    </div>
  );
}
