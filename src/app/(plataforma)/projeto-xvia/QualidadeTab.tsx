import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { fmtNum, qualidadeDados, type EtpUst, type TfsContrato, type TfsItem } from "@/lib/tfs";
import { OrigemBotao } from "./OrigemBotao";

/** Nível 3 — qualidade do dado: o que falta no TFS para os números serem
 * confiáveis. Nada é preenchido por suposição; aqui aparece o que falta. */
export function QualidadeTab({ itens, etp, contrato }: { itens: TfsItem[]; etp: EtpUst | null; contrato: TfsContrato | null }) {
  const verificacoes = qualidadeDados(itens, etp, contrato);
  const comProblema = verificacoes.filter((v) => v.itens.length > 0 || v.nota);
  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={comProblema.length ? `${comProblema.length} verificações encontraram lacunas no dado.` : "Nenhuma lacuna encontrada no dado."}
        comoLer="Cada linha é uma regra de qualidade. Item sem sprint, sem módulo ou sem responsável deixa o painel incompleto; tarefa sem código do catálogo fica fora da conta de UST. Corrigir no TFS e esperar a próxima atualização."
      />
      <DashboardSection title="Fontes de dados">
        <ul className="flex flex-col gap-2 text-sm">
          {[
            { fonte: "TFS (backlog, sprints, responsáveis, execução de UST)", situacao: "Integrado pela API. Só responde na rede do Governo: a atualização roda numa máquina da SGD (data no topo da página).", ok: true },
            { fonte: "Valores do contrato (itens 1, 2 e 3, valor da UST, previsão mensal)", situacao: "Lidos do TR pós-parecer (contrato.json, preenchido à mão, com a fonte em cada campo).", ok: true },
            { fonte: "Ordens de Serviço", situacao: "Sem fonte disponível — precisa de planilha ou sistema com número, órgão, serviço e UST prevista.", ok: false },
            { fonte: "Fiscalização e aceite (UST aceitas)", situacao: "Sem fonte disponível — precisa do registro de aceite por OS.", ok: false },
            { fonte: "Notas fiscais e medições (faturado)", situacao: "O TFS tem os campos Faturado e Data de Faturamento, mas estão vazios.", ok: false },
            { fonte: "Pagamentos", situacao: "Sem fonte disponível — precisa do sistema financeiro oficial do Estado.", ok: false },
          ].map((f) => (
            <li key={f.fonte} style={{ borderLeft: `4px solid ${f.ok ? "var(--ds-color-success)" : "var(--ds-color-text-muted)"}`, paddingLeft: 8 }}>
              <b>{f.fonte}</b>
              <div className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>{f.situacao}</div>
            </li>
          ))}
        </ul>
      </DashboardSection>
      <DashboardSection title="O que falta no TFS?">
        <ul className="flex flex-col gap-3">
          {verificacoes.map((v) => (
            <li key={v.rotulo} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
              <span style={{ color: "var(--ds-color-text-primary)" }}>
                {v.rotulo}
                {v.nota && <span style={{ color: "var(--ds-color-text-muted)" }}> — {v.nota}</span>}
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <b style={{ color: v.itens.length ? "var(--ds-color-danger)" : "var(--ds-color-success)" }}>{fmtNum(v.itens.length)}</b>
                {v.itens.length > 0 && <OrigemBotao origem={{ rotulo: v.rotulo, detalhe: "Itens que precisam ser corrigidos no TFS.", itens: v.itens }} />}
              </span>
            </li>
          ))}
        </ul>
      </DashboardSection>
    </div>
  );
}
