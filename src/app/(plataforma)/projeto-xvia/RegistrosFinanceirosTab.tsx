import { StoryCard } from "@/components/dashboard/StoryCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { fmtData, fmtNum, fmtReais, recorteFinanceiro, type Financeiro } from "@/lib/tfs";
import { cinza } from "./comum";

/** Nível 3, B — os registros do financeiro.json como estão, para conferir cada valor
 * contra o documento (fonte em cada linha). Nada calculado aqui além das divergências. */
export function RegistrosFinanceirosTab({ financeiro }: { financeiro: Financeiro | null }) {
  const f = financeiro ?? { ordensServico: [], medicoes: [], notasFiscais: [], pagamentos: [], glosas: [] };
  const { divergencias } = recorteFinanceiro(financeiro);
  const grupos: { titulo: string; linhas: string[] }[] = [
    { titulo: "Ordens de Serviço", linhas: f.ordensServico.map((o) => `${o.numero} · ${o.orgao} · ${o.servico ?? "—"} · ${fmtNum(o.ustPrevista)} UST · ${o.status} · ${fmtData(o.data ?? null)} · fonte: ${o.fonte}`) },
    { titulo: "Medições e aceite", linhas: f.medicoes.map((m) => `${m.id} · OS ${m.os} · ${m.periodo} · ${fmtNum(m.ustExecutada)} executadas · ${m.ustAceita == null ? "aceite não registrado" : `${fmtNum(m.ustAceita)} aceitas`} · ${m.status} · fonte: ${m.fonte}`) },
    { titulo: "Notas fiscais", linhas: f.notasFiscais.map((n) => `${n.numero} · medições ${n.medicoes.join(", ") || "—"} · ${fmtReais(n.valor)} · ${n.status} · ${fmtData(n.data ?? null)} · fonte: ${n.fonte}`) },
    { titulo: "Pagamentos", linhas: f.pagamentos.map((p) => `Nota ${p.notaFiscal} · ${fmtReais(p.valor)} · ${p.status} · ${fmtData(p.data)} · fonte: ${p.fonte}`) },
    { titulo: "Glosas", linhas: f.glosas.map((g) => `${g.medicao ?? g.notaFiscal ?? "—"} · ${fmtReais(g.valor)} · ${g.motivo} · fonte: ${g.fonte}`) },
  ];
  const total = grupos.reduce((s, g) => s + g.linhas.length, 0);
  return (
    <div className="flex flex-col gap-6">
      <StoryCard
        anchor={total ? `${fmtNum(total)} registros financeiros do contrato X-VIA.` : "Nenhum registro financeiro do contrato foi lançado ainda."}
        caption={divergencias.length ? `${fmtNum(divergencias.length)} divergências entre os registros.` : undefined}
        comoLer="Registros manuais em datasets/tfs/v1/financeiro.json, só do contrato da X-VIA. Cada linha traz a fonte (processo SEI, nota, ordem bancária) para conferir no documento original."
      />
      {grupos.map((g) => (
        <DashboardSection key={g.titulo} title={`${g.titulo} (${fmtNum(g.linhas.length)})`}>
          {g.linhas.length === 0 ? <p className="text-sm" style={cinza}>Não informado: nenhum registro.</p>
            : <ul className="text-sm flex flex-col gap-1">{g.linhas.map((l) => <li key={l}>{l}</li>)}</ul>}
        </DashboardSection>
      ))}
      {divergencias.length > 0 && (
        <DashboardSection title="Divergências">
          <ul className="text-sm flex flex-col gap-1" style={{ color: "var(--ds-color-danger)" }}>{divergencias.map((d) => <li key={d}>{d}</li>)}</ul>
        </DashboardSection>
      )}
    </div>
  );
}
