import { bugsDoQa, fmtData, fmtNum, fmtReais, quemResolve } from "@/lib/tfs";
import { prepararResumoXvia, type EntradaResumoXvia } from "@/lib/xvia-resumo";
import { PainelSecretario } from "./PainelSecretario";
import { SlaSecao } from "./SlaSecao";
import { ExecucaoMensal } from "./ExecucaoMensal";
import { TabelaCadeia } from "./CadeiaFinanceira";
import { BotaoLink, LinkItem, SecaoRelatorio, Sigla, cinza } from "./comum";

/** Relatório completo para impressão. Nível 1 — relatório mensal do Secretário Executivo (prompt, item 13). Só a X-VIA entra
 * em execução, entregas e financeiro; a SGD aparece à parte, como responsabilidade. O que
 * não tem fonte diz isso em uma linha, sem cartão vazio. */
export function RelatorioMensal(props: EntradaResumoXvia & { onIrPara: (aba: string) => void }) {
  const { contrato, hoje, recorte, onIrPara } = props;
  const r = prepararResumoXvia(props);
  const { xv, prazo, consumo, andamento, atraso, crono, features, featuresProntas, cadeia, mes, anterior: ant, entregasMes, entregasAnt, vigencia, veredito, cabecalho, pendSgd, proximosRelatorio: proximos } = r;
  const decisoes = r.paradas;
  const nomeMes = (m: string) => m === mes ? r.nomeMes : m === ant ? r.nomeMesAnterior : m;
  return (
    <div className="flex flex-col gap-5">
      <SecaoRelatorio n={1} titulo="Contrato e período">
        <p>
          {contrato?.contrato ?? "Contrato X-VIA"} · vigência de {fmtData(prazo.inicio)} a {fmtData(prazo.fim)} ({vigencia} meses).
        </p>
        {recorte && <p style={{ color: "var(--ds-color-text-primary)" }}>Filtro ativo: os números seguem os filtros aplicados e não são comparados com o previsto do contrato inteiro.</p>}
      </SecaoRelatorio>

      <SecaoRelatorio n={2} titulo="Resumo executivo">
        <PainelSecretario cabecalho={cabecalho} frase={veredito.frase} tom={veredito.tom} sinais={veredito.sinais} onIrPara={onIrPara} />
      </SecaoRelatorio>

      <SecaoRelatorio n={3} titulo="O que foi executado no mês?">
        <ExecucaoMensal dados={r.mensal} hoje={hoje} />
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
        <p><b>{fmtNum(decisoes.length)}</b> entregas da X-VIA aguardam decisão, estão impedidas ou dependem de outra; <b>{fmtNum(atraso.length)}</b> passaram da sprint ou do prazo. A ação e o responsável no registro estão em Prioridades.</p>
      </SecaoRelatorio>

      <SecaoRelatorio n={8} titulo="Fiscalização e aceite">
        <p>{cadeia.ustAceita.valor === null
          ? <>Sem registro de aceite: as <Sigla s="UST" /> executadas ainda não têm aprovação formal da fiscalização registrada.</>
          : <><b>{fmtNum(cadeia.ustAceita.valor)} UST aceitas</b> de {fmtNum(consumo.ustExecutada)} executadas.</>}</p>
      </SecaoRelatorio>

      <SecaoRelatorio n={9} titulo="Execução financeira e pagamentos" acao={<BotaoLink onClick={() => onIrPara("financeiro")}>Ver por órgão e serviço</BotaoLink>}>
        <p className="text-sm" style={cinza}>A execução segue os filtros aplicados. Ordens de Serviço, aceites, notas e pagamentos são registros do contrato inteiro, independentes das tarefas.</p>
        <TabelaCadeia cadeia={cadeia} />
        <p className="text-xs" style={cinza}>
          Contrato: {consumo.valorTotalContrato ? fmtReais(consumo.valorTotalContrato) : "valor a informar"}. Serviços em UST: {consumo.valorItem3 ? fmtReais(consumo.valorItem3) : "—"}.
          Licença e implantação (preço global) ainda não são acompanhadas aqui.
        </p>
      </SecaoRelatorio>

      <SecaoRelatorio n={10} titulo="Riscos e decisões necessárias">
        <ul className="flex flex-col gap-2">
          {decisoes.slice(0, 5).map((d) => (
            <li key={d.id}><LinkItem item={d} /> <span style={cinza}>· {d.coluna ?? "Dependência"} · {fmtNum(d.diasSemAtualizar ?? 0)} dias sem atualização · responsável no registro: {quemResolve(d)}</span></li>
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
