import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import {
  andamentoEntregas,
  atrasadas,
  consumoContrato,
  fmtData,
  fmtNum,
  fmtReais,
  linkTfs,
  pendencias,
  prazoProjeto,
  quemResolve,
  sinteseExecutiva,
  type EtpUst,
  type Origem,
  type TfsContrato,
  type TfsItem,
  type TfsSprint,
} from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";

type Tom = "ok" | "atencao" | "critico" | "info" | "neutro";
const COR: Record<Tom, string> = {
  ok: "var(--ds-color-success)",
  atencao: "var(--ds-color-warning, #d97706)",
  critico: "var(--ds-color-danger)",
  info: "var(--ds-color-primary-600)",
  neutro: "var(--ds-color-text-muted)",
};

/** Cartão de indicador do Nível 1: pergunta, número grande, explicação curta e a origem. */
function Indicador({ pergunta, valor, sub, tom, origem, extra }: {
  pergunta: string; valor: string; sub: string; tom: Tom; origem: Origem; extra?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-1"
      style={{ border: "1px solid var(--ds-color-border)", borderTop: `4px solid ${COR[tom]}`, borderRadius: "var(--ds-radius-md)", padding: "var(--ds-spacing-16)", background: "var(--ds-color-background)" }}
    >
      <span className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>{pergunta}</span>
      <span className="text-3xl font-semibold" style={{ color: COR[tom] }}>{valor}</span>
      <span className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>{sub}</span>
      {extra}
      <div className="mt-auto pt-1"><OrigemBotao origem={origem} /></div>
    </div>
  );
}

/** Nível 1 — Visão do Secretário Executivo. Responde às 5 perguntas sem rolar:
 * prazo, consumo do contrato (UST e R$), andamento das entregas, decisões
 * pendentes e o que está em produção. Consumo de UST e andamento são
 * indicadores diferentes e nunca se combinam. */
export function ExecutivoTab({ itens, sprints, contrato, etp, hoje, onIrPara }: {
  itens: TfsItem[]; sprints: TfsSprint[]; contrato: TfsContrato | null; etp: EtpUst | null; hoje: string; onIrPara: (aba: string) => void;
}) {
  const prazo = prazoProjeto(contrato, sprints, hoje);
  const consumo = consumoContrato(itens, etp, contrato, prazo.mesDoContrato);
  const andamento = andamentoEntregas(itens);
  const decisoes = pendencias(itens);
  const atraso = atrasadas(itens, sprints, hoje);

  const sintese = sinteseExecutiva({
    pctPrazo: prazo.pctDecorrido, diasRestantes: prazo.diasRestantes, aConciliar: prazo.aConciliar,
    pctEntregas: andamento.pct, ustExecutada: consumo.ustExecutada, previstoAteMes: consumo.previstoAteMes,
    decisoes: decisoes.length, atrasadas: atraso.length,
  });

  const prazoTom: Tom = prazo.aConciliar ? "atencao" : prazo.pctDecorrido - andamento.pct >= 20 ? "critico" : "info";
  const prazoOrigem: Origem = {
    rotulo: "Prazo do contrato",
    detalhe: `${contrato?.vigenciaMeses ? `Vigência de ${contrato.vigenciaMeses} meses (TR, item 1.3). ` : ""}${prazo.opcoes
      .map((o) => `Início ${fmtData(o.inicio)} (${o.fonteInicio}) → fim ${fmtData(o.fim)}: ${o.pctDecorrido}% do prazo, faltam ${fmtNum(o.diasRestantes)} dias.`)
      .join(" ")}${prazo.aConciliar ? " As fontes divergem: a data de início precisa ser conciliada." : ""}`,
  };
  const ustPct = consumo.pctExecutado;
  const ustTom: Tom = consumo.previstoAteMes !== null && consumo.ustExecutada < consumo.previstoAteMes * 0.5 ? "atencao" : "info";
  const decisaoOrigem: Origem = {
    rotulo: "Entregas que aguardam decisão ou estão impedidas",
    detalhe: "Entregas abertas na coluna Aguardando decisão ou Impedido, ou com a etiqueta Dependência (query Pendências em Shared Queries/BI SETDIG). Ordenadas pelas mais paradas.",
    itens: decisoes,
  };
  const producaoOrigem = andamento.origem;

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={sintese}
        caption={prazo.sprintAtual ? `Sprint atual: ${prazo.sprintAtual.nome} (${fmtData(prazo.sprintAtual.inicio)} a ${fmtData(prazo.sprintAtual.fim)}). Mês ${prazo.mesDoContrato} de ${contrato?.vigenciaMeses ?? "—"} do contrato.` : undefined}
        comoLer="Consumo do contrato (UST e reais) e andamento das entregas são medidas diferentes: a primeira diz quanto do contrato foi usado; a segunda, quanto do que foi planejado já está em produção. Toque em 'De onde vem?' para ver os itens do TFS por trás de cada número."
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        <Indicador
          pergunta="1. Estamos no prazo?"
          valor={`${fmtNum(prazo.diasRestantes)} dias`}
          sub={`restantes · ${prazo.pctDecorrido}% do prazo já passou${prazo.aConciliar ? " · início a conciliar" : ""}`}
          tom={prazoTom}
          origem={prazoOrigem}
        />
        <Indicador
          pergunta="2. Consumo do contrato (UST)"
          valor={consumo.valorExecutado === null ? `${fmtNum(consumo.ustExecutada)} UST` : fmtReais(consumo.valorExecutado)}
          sub={`${fmtNum(consumo.ustExecutada)} de ${consumo.ustTotal ? fmtNum(consumo.ustTotal) : "—"} UST (${ustPct ?? "—"}%)${consumo.previstoAteMes !== null ? ` · previsto até o mês: ${fmtNum(consumo.previstoAteMes)}` : ""} · faturado: a informar`}
          tom={ustTom}
          origem={consumo.origem}
          extra={consumo.saldoValor !== null && (
            <span className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
              Saldo do Item 3: {fmtNum(consumo.saldoUst ?? 0)} UST · {fmtReais(consumo.saldoValor)}
            </span>
          )}
        />
        <Indicador
          pergunta="3. Andamento das entregas"
          valor={`${andamento.pct}%`}
          sub={`${fmtNum(andamento.emProducao)} de ${fmtNum(andamento.planejadas)} entregas em produção · ${fmtNum(atraso.length)} atrasadas`}
          tom={atraso.length ? "atencao" : "ok"}
          origem={andamento.origem}
        />
        <Indicador
          pergunta="4. O que pede decisão?"
          valor={fmtNum(decisoes.length)}
          sub="entregas aguardando decisão ou impedidas"
          tom={decisoes.length ? "critico" : "ok"}
          origem={decisaoOrigem}
        />
        <Indicador
          pergunta="5. Em produção"
          valor={fmtNum(andamento.emProducao)}
          sub={`entregas disponíveis · ${fmtNum(andamento.emHomologacao)} em homologação`}
          tom="ok"
          origem={producaoOrigem}
        />
      </div>

      <DashboardSection
        title="Decisões e riscos"
        action={decisoes.length > 5 ? (
          <button type="button" onClick={() => onIrPara("pendencias")} className="text-sm font-medium underline" style={{ color: "var(--ds-color-primary-600)" }}>
            Ver todas ({fmtNum(decisoes.length)})
          </button>
        ) : undefined}
      >
        {decisoes.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ds-color-text-secondary)" }}>Nenhuma entrega aguarda decisão ou está impedida.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {decisoes.slice(0, 5).map((d) => (
              <li key={d.id} className="text-sm flex flex-col sm:flex-row sm:justify-between gap-1">
                <span>
                  <a href={linkTfs(d.id)} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>#{d.id}</a>{" "}
                  <span style={{ color: "var(--ds-color-text-primary)" }}>{d.titulo}</span>
                  <span style={{ color: "var(--ds-color-text-muted)" }}> · {d.coluna ?? "Dependência"} · {d.epico ?? "sem módulo"}</span>
                </span>
                <span className="shrink-0" style={{ color: "var(--ds-color-text-secondary)" }}>
                  Quem resolve: {quemResolve(d)} · {fmtNum(d.diasSemAtualizar ?? 0)} dias parado
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      <p className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
        Valores do contrato: TR pós-parecer, 9.3 — total {consumo.valorTotalContrato ? fmtReais(consumo.valorTotalContrato) : "a informar"}
        {consumo.valorItem3 ? `; Item 3 (UST) ${fmtReais(consumo.valorItem3)}` : ""}. Itens 1 (licença) e 2 (implantação) são de preço global; o pagamento deles ainda não é acompanhado aqui.
      </p>
    </div>
  );
}
