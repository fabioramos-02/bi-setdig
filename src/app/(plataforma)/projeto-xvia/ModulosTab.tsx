import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import { fmtNum, porModulo, TIPOS_ENTREGA, type Filtros, type LinhaModulo, type TfsItem } from "@/lib/tfs";
import type { Filtrar } from "./ProjetoXviaClient";

const colunas: Coluna<LinhaModulo>[] = [
  { key: "epico", label: "Módulo", sortable: true, sortValue: (r) => r.epico, render: (r) => r.epico },
  { key: "total", label: "Entregas", align: "right", sortable: true, sortValue: (r) => r.total, render: (r) => fmtNum(r.total) },
  { key: "xvia", label: "Frente X-VIA", align: "right", sortable: true, sortValue: (r) => r.xvia, render: (r) => fmtNum(r.xvia) },
  { key: "sgd", label: "Frente SGD", align: "right", sortable: true, sortValue: (r) => r.sgd, render: (r) => fmtNum(r.sgd) },
  ...TIPOS_ENTREGA.map((t): Coluna<LinhaModulo> => ({
    key: t, label: t, align: "right", sortable: true, sortValue: (r) => r.porTipo[t], render: (r) => fmtNum(r.porTipo[t]),
  })),
  { key: "producao", label: "Em produção", align: "right", sortable: true, sortValue: (r) => r.emProducao, render: (r) => fmtNum(r.emProducao) },
  { key: "pend", label: "Pendências", align: "right", sortable: true, sortValue: (r) => r.pendencias, render: (r) => fmtNum(r.pendencias) },
];

/** Por módulo (épico do TFS): o que é da X-VIA e o que é da SGD, quanto já
 * está em produção e em que etapa do fluxo está cada entrega. */
export function ModulosTab({ itens, filtros, filtrar }: { itens: TfsItem[]; filtros: Filtros; filtrar: Filtrar }) {
  const modulos = porModulo(itens);
  const maior = modulos[0];

  return (
    <div className="flex flex-col gap-6">
      {maior && !filtros.modulo && (
        <StoryCard
          anchor={`${maior.epico} é o módulo com mais entregas: ${fmtNum(maior.total)}, sendo ${fmtNum(maior.emProducao)} já em produção.`}
          comoLer="A frente SGD reúne o que o time da SGD toca (área SGD no TFS); o resto é da X-VIA. Tipo de entrega vem da coluna do quadro: Área de Negócios = Negócio; Aguardando Validação do Órgão = Órgão; Em Desenvolvimento, Em Homologação e Em Produção = Desenvolvimento X-VIA. Entregas em outras colunas (A fazer, Impedido…) não entram nos tipos."
        />
      )}

      <DashboardSection title="Quanto de cada módulo já está em produção?">
        <StackedBarChart itens={modulos.map((m) => ({ label: m.epico, atendidos: m.emProducao, pendentes: m.total - m.emProducao }))} />
        <p className="mt-3 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          Verde: entregas em produção. Vermelho: entregas ainda em andamento. Clique numa linha da tabela abaixo para ver só aquele módulo em todas as abas.
        </p>
      </DashboardSection>

      <DashboardSection title="Como as entregas se dividem entre X-VIA e SGD em cada módulo?">
        <div className="overflow-x-auto min-w-0">
          <DataTable columns={colunas} rows={modulos} rowKey={(r) => r.epico} onRowClick={(r) => filtrar("modulo", r.epico)} />
        </div>
      </DashboardSection>
    </div>
  );
}
