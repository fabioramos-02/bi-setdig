import { BarChart } from "@/components/charts/BarChart";
import { PlatformBarChart } from "@/components/charts/PlatformBarChart";
import { ChoroplethMap } from "@/components/charts/ChoroplethMap";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { AvisoSnapshotAproximado, type StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { InsightPlataforma, InsightHorario } from "@/lib/insights";
import type { Plataforma, HorarioGa4, Cidade } from "@/lib/data";

/** Perfil técnico do uso do app — em que aparelho, em que horário e de onde
 * o cidadão abre o MS Digital. Distinto do mapa de "endereço no cadastro"
 * na aba Contas: aqui é LOCAL DE ACESSO, reativo ao filtro (GA4 city). */
export function PerfilTab({
  plataforma,
  horarios,
  cidadesAcesso,
  insightPlataforma,
  insightHorario,
  status,
}: {
  plataforma: Plataforma[];
  horarios: HorarioGa4[];
  cidadesAcesso: Cidade[];
  insightPlataforma: InsightPlataforma | null;
  insightHorario: InsightHorario | null;
  status: StatusIntervalo;
}) {
  const horariosRotulados = horarios.map((h) => ({ ...h, hora: `${h.hora}h` }));

  return (
    <div className="flex flex-col gap-6">
      <AvisoSnapshotAproximado status={status} />
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Aparelho
          </h3>
          <ChartLoading status={status} height={220}>
            <PlatformBarChart dados={plataforma} />
          </ChartLoading>
        </div>
        <div>
          <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
            Horário de uso
          </h3>
          <ChartLoading status={status} height={260}>
            <BarChart data={horariosRotulados} xKey="hora" yKey="sessoes" height={260} />
          </ChartLoading>
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

      {cidadesAcesso.length > 0 && (
        <StoryCard
          anchor="De onde os cidadãos abrem o app no período."
          caption={`${cidadesAcesso.length} cidade${cidadesAcesso.length === 1 ? "" : "s"} com pelo menos um acesso identificado. Reage ao filtro à esquerda.`}
          comoLer='Este mapa é diferente do mapa de "endereço no cadastro" (aba Contas). Aqui o app pode ser aberto de qualquer lugar — a localização vem do dispositivo do usuário no momento do acesso, e conta um dispositivo por vez (quem usa em celular + tablet aparece duas vezes).'
        >
          <ChartLoading status={status} height={480}>
            <ChoroplethMap cidades={cidadesAcesso} unidade="acessos no app" />
          </ChartLoading>
        </StoryCard>
      )}
    </div>
  );
}
