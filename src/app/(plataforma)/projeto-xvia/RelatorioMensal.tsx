import { StoryCard } from "@/components/dashboard/StoryCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { montarCronograma } from "@/lib/cronograma";
import {
  andamentoEntregas, atrasadas, cadeiaFinanceira, consumoContrato, entregasDoMes, executadoPorMes, fmtData, fmtNum, fmtReais,
  pendencias, prazoProjeto, quemResolve, sinteseExecutiva, soXvia,
  type EtpUst, type Financeiro, type Origem, type TfsContrato, type TfsItem, type TfsSprint,
} from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { TabelaCadeia } from "./CadeiaFinanceira";
import { BotaoLink, COR, LinkItem, SecaoRelatorio, Sigla, cinza, type Tom } from "./comum";

const nomeMes = (aaaamm: string) => new Date(`${aaaamm}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const mesAnterior = (aaaamm: string) => {
  const d = new Date(`${aaaamm}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

/** Nível 1 — relatório mensal do Secretário Executivo (prompt, item 13). Só a X-VIA entra
 * em execução, entregas e financeiro; a SGD aparece à parte, como responsabilidade. O que
 * não tem fonte diz isso em uma linha, sem cartão vazio. */
export function RelatorioMensal({ itens, sprints, contrato, etp, financeiro, hoje, recorte, onIrPara }: {
  itens: TfsItem[]; sprints: TfsSprint[]; contrato: TfsContrato | null; etp: EtpUst | null; financeiro: Financeiro | null;
  hoje: string; recorte: boolean; onIrPara: (aba: string) => void;
}) {
  const xv = soXvia(itens);
  const prazo = prazoProjeto(contrato, sprints, hoje);
  const consumo = consumoContrato(itens, etp, contrato, prazo.mesDoContrato);
  const andamento = andamentoEntregas(xv);
  const atraso = atrasadas(xv, sprints, hoje);
  const decisoes = pendencias(xv);
  const pendSgd = pendencias(itens.filter((i) => i.frente === "SGD"));
  const crono = montarCronograma(xv, sprints, null, hoje);
  const cadeia = cadeiaFinanceira(financeiro, { ust: consumo.ustExecutada, valor: consumo.valorExecutado });
  const mes = hoje.slice(0, 7);
  const ant = mesAnterior(mes);
  const porMes = executadoPorMes(itens, etp).meses;
  const ustDo = (m: string) => porMes.find((x) => x.mes === m);
  const entregasMes = entregasDoMes(xv, mes).flatMap((g) => g.itens);
  const entregasAnt = entregasDoMes(xv, ant).flatMap((g) => g.itens);
  const vigencia = contrato?.vigenciaMeses ?? 18;

  const sintese = sinteseExecutiva({
    pctPrazo: prazo.pctDecorrido, diasRestantes: prazo.diasRestantes, aConciliar: prazo.aConciliar, pctEntregas: andamento.pct,
    ustExecutada: consumo.ustExecutada, previstoAteMes: consumo.previstoAteMes, decisoes: decisoes.length, atrasadas: atraso.length, recorte,
  });
  const ritmo = consumo.previstoAteMes ? consumo.ustExecutada / consumo.previstoAteMes : null;
  const ustTom: Tom = recorte || ritmo === null ? "info" : ritmo < 0.5 ? "critico" : ritmo < 0.8 ? "atencao" : "ok";
  const prazoTom: Tom = prazo.pctDecorrido - andamento.pct >= 20 ? "critico" : prazo.pctDecorrido > andamento.pct ? "atencao" : "ok";
  const decisaoOrigem: Origem = { rotulo: "Entregas da X-VIA que aguardam decisão ou estão impedidas", detalhe: "Coluna Aguardando decisão ou Impedido, ou etiqueta Dependência. Só a frente X-VIA.", itens: decisoes };
  const ustMesOrigem = (m: string): Origem => ({ rotulo: `UST executadas em ${nomeMes(m)}`, detalhe: "Tarefas da X-VIA concluídas no mês (data de fechamento), com código do catálogo.", itens: ustDo(m)?.itens ?? [] });
  const proximos = [...atraso, ...decisoes.filter((d) => !atraso.includes(d))].slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <SecaoRelatorio n={1} titulo="Contrato e período">
        <p>
          {contrato?.contrato ?? "Contrato X-VIA"} · relatório de <b>{nomeMes(mes)}</b> · mês <b>{prazo.mesDoContrato} de {vigencia}</b> ·
          vigência de {fmtData(prazo.inicio)} a {fmtData(prazo.fim)} · dados do TFS de {fmtData(hoje)}.
        </p>
        {recorte && <p style={{ color: COR.atencao }}>Filtro ativo: os números são do recorte e não são comparados com o previsto do contrato inteiro.</p>}
      </SecaoRelatorio>

      <SecaoRelatorio n={2} titulo="Resumo executivo">
      <StoryCard anchor={sintese} comoLer="Uso do contrato (UST e reais) e andamento das entregas são medidas diferentes: uma diz quanto do contrato foi usado; a outra, quanto do planejado já está em produção. Só entram tarefas e entregas da X-VIA; as da SGD aparecem à parte." />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Estamos no prazo?" value={`${prazo.pctDecorrido}%`} sub={`do prazo já passou (${fmtNum(prazo.diasRestantes)} dias restantes) · ${andamento.pct}% das entregas em produção`} cor={COR[prazoTom]}>
          <OrigemBotao origem={{ rotulo: "Prazo do contrato", detalhe: `Vigência de ${vigencia} meses contados da assinatura (${fmtData(prazo.inicio)}); fim em ${fmtData(prazo.fim)}.` }} />
        </MetricCard>
        <MetricCard label="Quanto do contrato foi usado?" value={`${fmtNum(consumo.ustExecutada)} UST`}
          sub={recorte ? "neste recorte" : `${consumo.pctExecutado === null ? "—" : fmtNum(consumo.pctExecutado)}% das ${fmtNum(consumo.ustTotal ?? 0)} contratadas · previsto até este mês: ${fmtNum(consumo.previstoAteMes ?? 0)}`} cor={COR[ustTom]}>
          <OrigemBotao origem={consumo.origem} />
        </MetricCard>
        <MetricCard label="Quanto foi pago?" value={cadeia.valorPago.valor === null ? "Não informado" : fmtReais(cadeia.valorPago.valor)}
          sub={cadeia.valorPago.valor === null ? "Sem registro de pagamento (financeiro.json vazio)" : "pagamentos registrados"} cor={COR[cadeia.valorPago.valor === null ? "neutro" : "info"]} />
        <MetricCard label="O que pede decisão?" value={fmtNum(decisoes.length)} sub={`entregas da X-VIA paradas · ${fmtNum(atraso.length)} passaram do prazo`} cor={COR[decisoes.length ? "critico" : "ok"]}>
          <OrigemBotao origem={decisaoOrigem} />
        </MetricCard>
      </div>
      </SecaoRelatorio>

      <SecaoRelatorio n={3} titulo="O que foi executado no mês?">
        <p>
          <b>{fmtNum(ustDo(mes)?.ust ?? 0)} <Sigla s="UST" /></b> em {nomeMes(mes)} até {fmtData(hoje)} ({fmtNum(ustDo(mes)?.itens.length ?? 0)} tarefas)
          {" "}· <b>{fmtNum(ustDo(ant)?.ust ?? 0)}</b> em {nomeMes(ant)}.
          {contrato?.valorUst ? ` Em reais: ${fmtReais((ustDo(mes)?.ust ?? 0) * contrato.valorUst)} e ${fmtReais((ustDo(ant)?.ust ?? 0) * contrato.valorUst)}.` : ""}
        </p>
        <OrigemBotao origem={ustMesOrigem(mes)} />
        <p className="text-xs" style={cinza}>Mês = data de fechamento da tarefa no TFS (a X-VIA quase não preenche a Data da Execução).</p>
      </SecaoRelatorio>

      <SecaoRelatorio n={4} titulo="Quais entregas foram feitas?" acao={<BotaoLink onClick={() => onIrPara("fiscalizacao")}>Ver por sprint</BotaoLink>}>
        <p><b>{fmtNum(entregasMes.length)}</b> entregas da X-VIA concluídas em {nomeMes(mes)} e <b>{fmtNum(entregasAnt.length)}</b> em {nomeMes(ant)}. No total, <b>{fmtNum(andamento.emProducao)} de {fmtNum(andamento.planejadas)}</b> estão em produção e {fmtNum(andamento.emHomologacao)} em <Sigla s="homologação" />.</p>
        <ul className="flex flex-col gap-1">{entregasMes.slice(0, 6).map((i) => <li key={i.id}><LinkItem item={i} /> <span style={cinza}>· {i.epico ?? "sem módulo"}</span></li>)}</ul>
      </SecaoRelatorio>

      <SecaoRelatorio n={5} titulo="Marcos e cronograma" acao={<BotaoLink onClick={() => onIrPara("cronograma")}>Ver cronograma</BotaoLink>}>
        <p>
          <b>{fmtNum(atraso.length)}</b> entregas da X-VIA passaram da sprint ou do prazo previsto; <b>{fmtNum(crono.contagem.risco)}</b> estão em risco porque dependem de algo atrasado ou planejado para a mesma sprint.
          {crono.proxima && (crono.proxima.previstas ? ` Na ${crono.proxima.nome} estão previstas ${fmtNum(crono.proxima.previstas)}.` : ` Nada planejado ainda para a ${crono.proxima.nome}.`)}
        </p>
        <p style={cinza}>{fmtNum(crono.contagem.ligacoes)} dependências registradas entre entregas da X-VIA. Marco formal do contrato (aceite de etapa) ainda não tem fonte.</p>
      </SecaoRelatorio>

      <SecaoRelatorio n={6} titulo="Indicadores e SLA">
        <p style={cinza}>Nenhum indicador de nível de serviço (SLA) é medido hoje: o contrato não tem fonte de tempos de atendimento ligada a este painel. Aparece aqui quando houver.</p>
      </SecaoRelatorio>

      <SecaoRelatorio n={7} titulo="Pendências e problemas" acao={<BotaoLink onClick={() => onIrPara("prioridades")}>Ver todas</BotaoLink>}>
        <p><b>{fmtNum(decisoes.length)}</b> entregas da X-VIA aguardam decisão, estão impedidas ou dependem de outra; <b>{fmtNum(atraso.length)}</b> passaram da sprint ou do prazo. A lista com quem resolve está em Prioridades.</p>
      </SecaoRelatorio>

      <SecaoRelatorio n={8} titulo="Fiscalização e aceite">
        <p>{cadeia.ustAceita.valor === null
          ? <>Sem registro de aceite: as <Sigla s="UST" /> executadas ainda não têm aprovação formal da fiscalização registrada.</>
          : <><b>{fmtNum(cadeia.ustAceita.valor)} UST aceitas</b> de {fmtNum(consumo.ustExecutada)} executadas.</>}</p>
      </SecaoRelatorio>

      <SecaoRelatorio n={9} titulo="Execução financeira e pagamentos" acao={<BotaoLink onClick={() => onIrPara("financeiro")}>Ver por órgão e serviço</BotaoLink>}>
        <TabelaCadeia cadeia={cadeia} />
        <p className="text-xs" style={cinza}>
          Contrato: {consumo.valorTotalContrato ? fmtReais(consumo.valorTotalContrato) : "valor a informar"}. Serviços em UST: {consumo.valorItem3 ? fmtReais(consumo.valorItem3) : "—"}.
          Licença e implantação (preço global) ainda não são acompanhadas aqui.
        </p>
      </SecaoRelatorio>

      <SecaoRelatorio n={10} titulo="Riscos e decisões necessárias">
        <ul className="flex flex-col gap-2">
          {decisoes.slice(0, 5).map((d) => (
            <li key={d.id}><LinkItem item={d} /> <span style={cinza}>· {d.coluna ?? "Dependência"} · {fmtNum(d.diasSemAtualizar ?? 0)} dias parada · quem resolve: {quemResolve(d)}</span></li>
          ))}
          {decisoes.length === 0 && <li style={cinza}>Nenhuma entrega da X-VIA aguarda decisão.</li>}
        </ul>
        {pendSgd.length > 0 && <p style={cinza}>Do lado do Estado, a SGD tem {fmtNum(pendSgd.length)} itens próprios parados (não contam na execução da X-VIA).</p>}
      </SecaoRelatorio>

      <SecaoRelatorio n={11} titulo="Próximos passos e responsáveis">
        <ul className="flex flex-col gap-2">
          {proximos.map((d) => <li key={d.id}><b>{quemResolve(d)}</b>: <LinkItem item={d} /></li>)}
          {proximos.length === 0 && <li style={cinza}>Nenhuma ação pendente registrada.</li>}
        </ul>
      </SecaoRelatorio>
    </div>
  );
}
