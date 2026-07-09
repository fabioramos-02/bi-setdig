import { BarChart } from "@/components/charts/BarChart";
import { CategoryLegend } from "@/components/ds/CategoryLegend";
import { iconeDoDispositivo, corDoDispositivo } from "@/lib/device-icon-map";
import type { Dispositivo } from "@/lib/data";

/** Dispositivos com ícone lucide (forma genérica, não marca) + cor por barra. */
export function DeviceBarChart({ dados }: { dados: Dispositivo[] }) {
  return (
    <div>
      <CategoryLegend
        items={dados.map((d) => {
          const Icone = iconeDoDispositivo(d.dispositivo);
          return { label: d.dispositivo, color: corDoDispositivo(d.dispositivo), icon: <Icone size={16} /> };
        })}
      />
      <BarChart
        data={dados}
        xKey="dispositivo"
        yKey="visitas"
        height={220}
        corPorIndice={(i) => corDoDispositivo(dados[i].dispositivo)}
      />
    </div>
  );
}
