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
