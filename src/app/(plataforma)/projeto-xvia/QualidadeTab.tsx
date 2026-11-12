import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { FONTES_CONTRATO, fmtData, fmtNum, qualidadeDados, type EtpUst, type Financeiro, type TfsContrato, type TfsItem } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";
import { COR, cinza } from "./comum";

/** Nível 3, F — qualidade do dado: fontes, data do retrato e o que falta para os números
 * serem confiáveis. Nada é preenchido por suposição; aqui aparece o que falta ou diverge. */
export function QualidadeTab({ itens, etp, contrato, financeiro, hoje, diasRetrato }: {
  itens: TfsItem[]; etp: EtpUst | null; contrato: TfsContrato | null; financeiro: Financeiro | null; hoje: string; diasRetrato: number | null;
}) {
  const verificacoes = qualidadeDados(itens, etp, contrato, financeiro);
  const comProblema = verificacoes.filter((v) => v.itens.length > 0 || v.nota);
  const velho = diasRetrato !== null && diasRetrato > 7;
  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={comProblema.length ? `${comProblema.length} verificações encontraram lacunas ou divergências no dado.` : "Nenhuma lacuna encontrada no dado."}
        caption={`Retrato do TFS de ${fmtData(hoje)}${diasRetrato !== null ? ` (${fmtNum(diasRetrato)} dias atrás)` : ""}.${velho ? " Atenção: retrato com mais de uma semana; solicitar uma nova atualização dos registros." : ""}`}
        comoLer="Cada linha é uma regra de qualidade. Item sem sprint, sem módulo ou sem responsável deixa o painel incompleto; tarefa sem código do catálogo ou sem frente identificada fica fora da conta da X-VIA. Corrigir no TFS e rodar a próxima atualização."
      />

      <DashboardSection title="O que falta ou diverge?">
        <ul className="flex flex-col gap-3">
          {verificacoes.map((v, n) => (
            <li key={`${v.rotulo}${n}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bi-body">
              <span style={{ color: "var(--ds-color-text-primary)" }}>
                {v.rotulo}
                {v.nota && <span style={cinza}> — {v.nota}</span>}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <b style={{ color: "var(--ds-color-text-primary)" }}>{fmtNum(v.itens.length)}</b>
                {v.itens.length > 0 && <OrigemBotao origem={{ rotulo: v.rotulo, detalhe: "Itens que precisam ser corrigidos no TFS.", itens: v.itens }} />}
              </span>
            </li>
          ))}
        </ul>
      </DashboardSection>
      <details><summary className="cursor-pointer bi-body font-semibold">Consultar documentos e atualização dos dados</summary>
      <DashboardSection title="Como cada informação chega ao painel?">
        <ul className="flex flex-col gap-2 bi-body">
          {FONTES_CONTRATO.map((f) => {
            const vazio = f.fonte === "financeiro.json" && !(financeiro && (financeiro.ordensServico.length || financeiro.notasFiscais.length || financeiro.pagamentos.length));
            return (
              <li key={f.fonte} style={{ borderLeft: `4px solid ${vazio ? COR.neutro : COR.ok}`, paddingLeft: 8 }}>
                <b>{f.fonte}</b> — {f.traz}
                <div className="bi-caption" style={cinza}>{f.como}{vazio ? " · sem registros: as etapas financeiras aparecem como Não informado" : ""}</div>
              </li>
            );
          })}
        </ul>
      </DashboardSection>
      </details>
    </div>
  );
}
