import { EmptyCard } from "@/components/ds/EmptyCard";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { CATEGORIAS_N4, type PanoramaN4 } from "@/lib/censo-n4";
import { KpiCenso } from "./KpiCenso";
import { CartasN4Table } from "./CartasN4Table";

/** Aba "Nível 4 na prática": os serviços declarados 100% online (nível 4)
 * conferidos contra as etapas da carta no Portal Único — o cidadão pede por
 * formulário online, ou baixa formulário e manda por e-mail? */
export function Nivel4Tab({ p, etapasLidas }: { p: PanoramaN4; etapasLidas: boolean }) {
  const total = p.cartas.length;

  if (total === 0 || !etapasLidas) {
    return (
      <EmptyCard
        message={total === 0
          ? "Nenhum órgão informou serviço no nível 4."
          : `${total.toLocaleString("pt-BR")} serviços estão no nível 4, mas as etapas das cartas ainda não foram lidas do Portal Único.`}
      />
    );
  }

  const n = (v: number) => v.toLocaleString("pt-BR");
  const cat = Object.fromEntries(p.porCategoria.map((c) => [c.id, c]));
  const fe = cat["formulario-email"];
  const lacuna = cat["sem-carta"].qtd + cat["sem-descricao"].qtd;
  const nOrgaos = new Set(p.cartas.map((c) => c.orgaoSigla)).size;
  const topo = p.orgaos[0];

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`Dos ${n(total)} serviços que os órgãos declararam 100% online (nível 4), ${n(cat.online.qtd)} (${cat.online.pct.toLocaleString("pt-BR")}%) recebem o pedido direto em formulário online ou sistema. Mas ${n(cat.presencial.qtd)} ainda pedem alguma ida presencial e ${n(fe.qtd)} mandam o cidadão baixar um formulário e enviar por e-mail.`}
        comoLer={`O nível 4 foi informado pelo próprio órgão. Aqui conferimos o que a carta publicada no Portal Único diz nas etapas, procurando palavras como "baixe o formulário", endereço de e-mail ou "compareça". É uma leitura automática do texto: a tabela mostra o trecho usado em cada serviço, para conferir.${lacuna ? ` ${n(lacuna)} serviços não têm carta ligada ou a carta não diz como pedir — eles continuam na conta, para a lacuna não sumir.` : ""}`}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCenso label="Declarados 100% online" value={n(total)} sub={`nível 4, em ${n(nOrgaos)} órgãos`} />
        <KpiCenso label="Baixa formulário e envia por e-mail" value={`${fe.pct.toLocaleString("pt-BR")}%`} sub={`${n(fe.qtd)} serviços`} tom="win" />
        <KpiCenso label="Formulário online ou sistema" value={`${cat.online.pct.toLocaleString("pt-BR")}%`} sub={`${n(cat.online.qtd)} serviços`} tom="digital" />
        <KpiCenso label="Cartas lidas no portal" value={n(p.comEtapas)} sub={`de ${n(total)} · as demais não têm carta ligada`} tom="info" />
      </div>

      <DashboardSection title="Como o cidadão faz o pedido nos serviços declarados 100% online?">
        <Distribuicao p={p} total={total} />
      </DashboardSection>

      {p.orgaos.length > 0 && (
        <DashboardSection title="Quais órgãos mais pedem formulário por e-mail?">
          <RankingBarChart
            cor="#ff6200"
            itens={p.orgaos.map((o) => ({ label: o.sigla, valor: o.formularioEmail, sublabel: `${o.pctFormularioEmail.toLocaleString("pt-BR")}% dos ${n(o.total)} serviços nível 4` }))}
            formatarValor={(v) => `${n(v)} serviços`}
          />
          {topo && (
            <p className="mt-4 text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>
              <strong>{topo.sigla}</strong> concentra o maior número: {n(topo.formularioEmail)} serviços em que o cidadão baixa formulário e manda por e-mail.
              Trocar esses envios por um formulário online é o caminho mais curto para o nível 4 facilitar de verdade.
            </p>
          )}
        </DashboardSection>
      )}

      <DashboardSection title="Serviços nível 4, um a um">
        <CartasN4Table cartas={p.cartas} />
      </DashboardSection>
    </div>
  );
}

/** Barra empilhada (proporção) + legenda com qtd, % e o que cada grupo significa. */
function Distribuicao({ p, total }: { p: PanoramaN4; total: number }) {
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex h-4 w-full overflow-hidden rounded-full" role="img" aria-label="Proporção de serviços por forma de pedido">
        {p.porCategoria.filter((c) => c.qtd > 0).map((c) => (
          <div key={c.id} style={{ width: `${(100 * c.qtd) / total}%`, background: c.cor }} title={`${c.rotulo}: ${c.qtd}`} />
        ))}
      </div>
      <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {p.porCategoria.map((c) => (
          <li key={c.id} className="flex gap-3 min-w-0">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: c.cor }} aria-hidden />
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
                {c.rotulo} — {c.qtd.toLocaleString("pt-BR")} ({c.pct.toLocaleString("pt-BR")}%)
              </div>
              <div className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
                {CATEGORIAS_N4.find((x) => x.id === c.id)?.descricao}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
