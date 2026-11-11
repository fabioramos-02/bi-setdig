"use client";

import { useState } from "react";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import {
  cadeiaFinanceira, consumoPorOrgao, execucaoXvia, fmtData, fmtNum, fmtReais, SEM_ORGAO,
  type EtpUst, type Financeiro, type LinhaOrgao, type LinhaServico, type TfsContrato, type TfsItem,
} from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { TabelaCadeia } from "./CadeiaFinanceira";
import { LinkItem, NI, ValorStatus, cinza } from "./comum";

type LinhaFin = LinhaOrgao & { cadeia: ReturnType<typeof cadeiaFinanceira> };

const colOrgao: Coluna<LinhaFin>[] = [
  { key: "orgao", label: "Órgão", sortable: true, sortValue: (r) => r.orgao, render: (r) => r.orgao },
  { key: "prevista", label: "UST previstas (OS)", align: "right", render: (r) => <ValorStatus v={r.cadeia.ustPrevista} ust /> },
  { key: "ust", label: "UST executadas", align: "right", sortable: true, sortValue: (r) => r.ustExecutada, render: (r) => fmtNum(r.ustExecutada) },
  { key: "aceitas", label: "UST aceitas", align: "right", render: (r) => <ValorStatus v={r.cadeia.ustAceita} ust /> },
  { key: "consumido", label: "Valor consumido", align: "right", sortable: true, sortValue: (r) => r.valorConsumido ?? 0, render: (r) => (r.valorConsumido === null ? NI : fmtReais(r.valorConsumido)) },
  { key: "faturado", label: "Faturado", align: "right", render: (r) => <ValorStatus v={r.cadeia.valorFaturado} /> },
  { key: "pago", label: "Pago", align: "right", render: (r) => <ValorStatus v={r.cadeia.valorPago} /> },
  { key: "pendente", label: "Pendente", align: "right", render: (r) => <ValorStatus v={r.cadeia.valorPendente} /> },
];

const colServico: Coluna<LinhaServico>[] = [
  { key: "servico", label: "Serviço", sortable: true, sortValue: (r) => r.servico, render: (r) => (r.pbiId ? <LinkItem item={{ id: r.pbiId, titulo: r.servico }} /> : r.servico) },
  { key: "ust", label: "UST executadas", align: "right", sortable: true, sortValue: (r) => r.ustExecutada, render: (r) => fmtNum(r.ustExecutada) },
  { key: "consumido", label: "Valor consumido", align: "right", sortable: true, sortValue: (r) => r.valorConsumido ?? 0, render: (r) => (r.valorConsumido === null ? NI : fmtReais(r.valorConsumido)) },
  { key: "tarefas", label: "Tarefas", align: "right", render: (r) => <OrigemBotao origem={{ rotulo: `Tarefas de ${r.servico}`, detalhe: "Tarefas da X-VIA concluídas, com código do catálogo, neste serviço.", itens: r.tarefas }} /> },
];

/** Nível 2 — "Quanto cada órgão e serviço consumiu, quanto foi faturado e quanto foi pago?"
 * Execução vem do TFS (só X-VIA); OS, aceite, nota fiscal e pagamento, do financeiro.json.
 * Projeto → Órgão → Serviço, e Órgão → OS → Medição → Nota fiscal → Pagamento. */
export function FinanceiroTab({ itens, etp, contrato, financeiro }: { itens: TfsItem[]; etp: EtpUst | null; contrato: TfsContrato | null; financeiro: Financeiro | null }) {
  const total = execucaoXvia(itens, etp, contrato);
  const projeto = cadeiaFinanceira(financeiro, { ust: total.ustExecutada, valor: total.valorExecutado });
  const linhas: LinhaFin[] = consumoPorOrgao(itens, etp, contrato).map((o) => ({
    ...o, cadeia: cadeiaFinanceira(financeiro, { ust: o.ustExecutada, valor: o.valorConsumido }, o.orgao === SEM_ORGAO ? "__sem__" : o.orgao),
  }));
  const [orgao, setOrgao] = useState<string | null>(null);
  const sel = linhas.find((l) => l.orgao === orgao) ?? null;
  const semOrgao = linhas.find((l) => l.orgao === SEM_ORGAO);
  const semRegistro = !financeiro || (financeiro.ordensServico.length + financeiro.notasFiscais.length + financeiro.pagamentos.length === 0);

  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={`A X-VIA executou ${fmtNum(total.ustExecutada)} UST${total.valorExecutado !== null ? ` (${fmtReais(total.valorExecutado)})` : ""} em ${fmtNum(linhas.filter((l) => l.orgao !== SEM_ORGAO).length)} órgãos.${semRegistro ? " Ordens de Serviço, aceite, notas fiscais e pagamentos ainda não foram registrados." : ""}`}
        caption={semOrgao ? `${fmtNum(semOrgao.ustExecutada)} UST estão em tarefas sem órgão identificado: aparecem numa linha própria, sem rateio.` : undefined}
        comoLer="Executado, aceito, faturado e pago são etapas diferentes, cada uma com sua fonte: tarefa concluída não é UST aceita, e nota fiscal não é pagamento. Etapa sem registro aparece como 'Não informado'. A soma por órgão é igual ao total executado. Clique num órgão para ver serviços e documentos."
      />

      <DashboardSection title="Do pedido ao pagamento: projeto inteiro">
        <TabelaCadeia cadeia={projeto} />
        {semRegistro && <p className="mt-2 text-xs" style={cinza}>Para preencher OS, medições, notas e pagamentos: datasets/tfs/v1/financeiro.json (modelo e regras no próprio arquivo).</p>}
      </DashboardSection>

      <DashboardSection title="Quanto cada órgão consumiu?">
        <div className="overflow-x-auto min-w-0">
          <DataTable columns={colOrgao} rows={linhas} rowKey={(r) => r.orgao} onRowClick={(r) => setOrgao(r.orgao === orgao ? null : r.orgao)} />
        </div>
        <p className="mt-2 text-xs" style={cinza}>Total da coluna UST executadas: {fmtNum(linhas.reduce((s, l) => s + l.ustExecutada, 0))} (igual ao executado do contrato).</p>
      </DashboardSection>

      {sel && (
        <DashboardSection title={`${sel.orgao}: serviços e documentos`} action={<OrigemBotao origem={{ rotulo: `Tarefas de ${sel.orgao}`, detalhe: "Tarefas da X-VIA concluídas, com código do catálogo, ligadas ao órgão pela Feature ou pelo campo Órgãos/Secretarias.", itens: sel.tarefas }} />}>
          <div className="overflow-x-auto min-w-0"><DataTable columns={colServico} rows={sel.servicos} rowKey={(r) => String(r.pbiId ?? r.servico)} /></div>
          <h3 className="mt-5 mb-2 text-sm font-semibold">Ordens de Serviço → medição → nota fiscal → pagamento</h3>
          {sel.cadeia.recorte.os.length === 0 ? (
            <p className="text-sm" style={cinza}>Nenhuma Ordem de Serviço registrada para {sel.orgao}.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {sel.cadeia.recorte.os.map((os) => {
                const meds = sel.cadeia.recorte.medicoes.filter((m) => m.os === os.numero);
                return (
                  <li key={os.numero} style={{ borderLeft: "3px solid var(--ds-color-primary-600)", paddingLeft: 8 }}>
                    <b>{os.numero}</b> · {os.servico ?? "serviço não informado"} · {fmtNum(os.ustPrevista)} UST previstas · {os.status} <span style={cinza}>({os.fonte})</span>
                    {meds.length === 0 && <div style={cinza}>Sem medição registrada.</div>}
                    {meds.map((m) => {
                      const nfs = sel.cadeia.recorte.notas.filter((n) => n.medicoes.includes(m.id));
                      return (
                        <div key={m.id} className="ml-3 mt-1">
                          Medição {m.id} ({m.periodo}): {fmtNum(m.ustExecutada)} executadas, {m.ustAceita == null ? "aceite não registrado" : `${fmtNum(m.ustAceita)} aceitas em ${fmtData(m.dataAceite ?? null)}`} <span style={cinza}>({m.fonte})</span>
                          {nfs.length === 0 && <div className="ml-3" style={cinza}>Sem nota fiscal.</div>}
                          {nfs.map((n) => {
                            const pags = sel.cadeia.recorte.pagamentos.filter((p) => p.notaFiscal === n.numero);
                            return (
                              <div key={n.numero} className="ml-3">
                                Nota {n.numero}: {fmtReais(n.valor)} · {n.status} <span style={cinza}>({n.fonte})</span>
                                <div className="ml-3">{pags.length === 0 ? <span style={cinza}>Pagamento não registrado.</span> : pags.map((p) => <div key={`${p.notaFiscal}${p.data}`}>Pagamento {fmtReais(p.valor)} em {fmtData(p.data)} · {p.status} <span style={cinza}>({p.fonte})</span></div>)}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardSection>
      )}
    </div>
  );
}
