import { BarChart } from "@/components/charts/BarChart";
import { iconeDoDispositivo, corDoDispositivo } from "@/lib/device-icon-map";
import type { Dispositivo } from "@/lib/data";

/** Dispositivos com ícone lucide (forma genérica, não marca) + cor por barra. */
export function DeviceBarChart({ dados }: { dados: Dispositivo[] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-2">
        {dados.map((d) => {
          const Icone = iconeDoDispositivo(d.dispositivo);
          return (
            <span key={d.dispositivo} className="flex items-center gap-1.5 text-xs" style={{ color: corDoDispositivo(d.dispositivo) }}>
              <Icone size={16} />
              {d.dispositivo}
            </span>
          );
        })}
      </div>
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
