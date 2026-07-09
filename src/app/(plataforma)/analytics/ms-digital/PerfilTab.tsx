import { BarChart } from "@/components/charts/BarChart";
import { PlatformBarChart } from "@/components/charts/PlatformBarChart";
import { StoryCard } from "@/components/dashboard/StoryCard";
import type { InsightPlataforma, InsightHorario } from "@/lib/insights";
import type { Plataforma, HorarioGa4 } from "@/lib/data";

/** Perfil técnico do uso do app — em que aparelho e em que horário o cidadão
 * usa o MS Digital. Cada gráfico ganha um StoryCard que traduz o número em
 * uma frase simples (antes era só um <p> solto, e o horário não tinha leitura). */
export function PerfilTab({
  plataforma,
  horarios,
  insightPlataforma,
  insightHorario,
}: {
  plataforma: Plataforma[];
  horarios: HorarioGa4[];
  insightPlataforma: InsightPlataforma | null;
  insightHorario: InsightHorario | null;
}) {
  const horariosRotulados = horarios.map((h) => ({ ...h, hora: `${h.hora}h` }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Aparelho
          </h3>
          <PlatformBarChart dados={plataforma} />
        </div>
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Horário de uso
          </h3>
          <BarChart data={horariosRotulados} xKey="hora" yKey="sessoes" height={260} />
        </div>
      </div>

      {insightPlataforma && (
        <StoryCard
          anchor={`A maior parte das pessoas usa o app pelo ${insightPlataforma.operatingSystem}: ${insightPlataforma.participacaoPct.toFixed(0)}% dos usuários.`}
          caption="O resto usa outros sistemas (como o iPhone)."
          comoLer="Mostra em qual tipo de celular o app é mais usado. Ajuda a decidir onde testar e melhorar o app primeiro."
        />
      )}

      {insightHorario && (
        <StoryCard
          anchor={`O app é mais usado por volta das ${insightHorario.horaPico}h.`}
          caption={`Nesse horário acontecem ${insightHorario.sessoesPico.toLocaleString("pt-BR")} acessos — ${insightHorario.participacaoPct.toFixed(0)}% do total do dia.`}
          comoLer="Cada acesso é uma vez que alguém abriu o app. Saber a hora de pico ajuda a evitar manutenção no momento de maior uso."
        />
      )}
    </div>
  );
}
