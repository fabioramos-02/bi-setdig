import { BarChart } from "@/components/charts/BarChart";
import { CategoryLegend } from "@/components/ds/CategoryLegend";
import { iconeDaPlataforma, corDaPlataforma } from "@/lib/platform-icon-map";
import type { Plataforma } from "@/lib/data";

export function PlatformBarChart({ dados }: { dados: Plataforma[] }) {
  return (
    <div>
      <CategoryLegend
        items={dados.map((d) => {
          const Icone = iconeDaPlataforma(d.operatingSystem);
          return { label: d.operatingSystem, color: corDaPlataforma(d.operatingSystem), icon: <Icone size={16} /> };
        })}
      />
      <BarChart
        data={dados}
        xKey="operatingSystem"
        yKey="activeUsers"
        height={260}
        corPorIndice={(i) => corDaPlataforma(dados[i].operatingSystem)}
      />
    </div>
  );
}
