import { montarCronograma } from "@/lib/cronograma";
import { enriquecerVeredito } from "@/lib/tfs-origem";
import {
  andamentoEntregas, atrasadas, bugsDoQa, ehEntrega, cadeiaFinanceira, consumoContrato, entregasDoMes, execucaoMensal, fmtData, fmtNum, fmtReais,
  pendencias, prazoProjeto, quemResolve, soXvia, vereditoExecutivo,
  type EtpUst, type Financeiro, type TfsContrato, type TfsItem, type TfsSprint,
} from "@/lib/tfs";
import { PainelSecretario } from "./PainelSecretario";
import { SlaSecao } from "./SlaSecao";
import { ExecucaoMensal } from "./ExecucaoMensal";
import { TabelaCadeia } from "./CadeiaFinanceira";
import { BotaoLink, COR, LinkItem, SecaoRelatorio, Sigla, cinza } from "./comum";

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
  // Marcos = Features da X-VIA: pronta quando todas as entregas dela estão concluídas.
  const features = xv.filter((i) => i.tipo === "Feature" && i.estado !== "Removed").map((f) => xv.filter((p) => ehEntrega(p) && p.estado !== "Removed" && p.featureId === f.id))
    .filter((ps) => ps.length);
  const featuresProntas = features.filter((ps) => ps.every((p) => p.estado === "Done")).length;
  const cadeia = cadeiaFinanceira(financeiro, { ust: consumo.ustExecutada, valor: consumo.valorExecutado });
  const mes = hoje.slice(0, 7);
  const ant = mesAnterior(mes);
  const entregasMes = entregasDoMes(xv, mes).flatMap((g) => g.itens);
  const entregasAnt = entregasDoMes(xv, ant).flatMap((g) => g.itens);
  const vigencia = contrato?.vigenciaMeses ?? 18;

  const veredito = enriquecerVeredito(
    vereditoExecutivo({ prazo, andamento, consumo, paradas: decisoes, atrasadas: atraso, recorte, semPagamento: financeiro === null || financeiro.pagamentos.length === 0 }),
    { itens: xv, prazo, andamento, consumo, paradas: decisoes, atrasadas: atraso, valorUst: contrato?.valorUst ?? null, recorte },
  );
  const sprintAgora = sprints.find((x) => x.situacao === "atual");
  const cabecalho = [nomeMes(mes), `mês ${prazo.mesDoContrato} de ${vigencia} do contrato`, sprintAgora ? `${sprintAgora.nome} até ${fmtData(sprintAgora.fim).slice(0, 5)}` : null, `dados do TFS de ${fmtData(hoje)}`].filter(Boolean).join(" · ");
  const proximos = [...atraso, ...decisoes.filter((d) => !atraso.includes(d))].slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <SecaoRelatorio n={1} titulo="Contrato e período">
        <p>
          {contrato?.contrato ?? "Contrato X-VIA"} · vigência de {fmtData(prazo.inicio)} a {fmtData(prazo.fim)} ({vigencia} meses).
        </p>
        {recorte && <p style={{ color: COR.atencao }}>Filtro ativo: os números são do recorte e não são comparados com o previsto do contrato inteiro.</p>}
      </SecaoRelatorio>

      <SecaoRelatorio n={2} titulo="Resumo executivo">
        <PainelSecretario cabecalho={cabecalho} frase={veredito.frase} tom={veredito.tom} sinais={veredito.sinais} onIrPara={onIrPara} />
      </SecaoRelatorio>

      <SecaoRelatorio n={3} titulo="O que foi executado no mês?">
        <ExecucaoMensal dados={execucaoMensal(itens, etp, contrato, hoje)} hoje={hoje} />
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
        <p><b>{fmtNum(featuresProntas)} de {fmtNum(features.length)}</b> Features da X-VIA estão com todas as entregas prontas.</p>
        <p style={cinza}>{fmtNum(crono.contagem.ligacoes)} dependências registradas entre entregas da X-VIA. Marco formal do contrato (aceite de etapa) ainda não tem fonte.</p>
      </SecaoRelatorio>

      <SecaoRelatorio n={6} titulo="Prazos de atendimento (SLA)">
        <SlaSecao ans={contrato?.ans ?? null} bugs={bugsDoQa(xv)} onIrPara={onIrPara} />
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
