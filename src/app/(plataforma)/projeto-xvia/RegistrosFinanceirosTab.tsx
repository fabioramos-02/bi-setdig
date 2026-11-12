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
        comoLer="Registros manuais da equipe financeira, do contrato inteiro da X-VIA. Não seguem os filtros de módulo, frente, órgão ou sprint. Cada linha informa o documento de origem (processo SEI, nota ou ordem bancária)."
      />
      {total === 0 ? <DashboardSection title="O que falta registrar?">
        <p className="bi-body mb-3">Solicitar os documentos à equipe financeira. Ausência de registro não significa valor zero.</p>
        <ul className="flex flex-col gap-2 bi-body">{grupos.map((g) => <li key={g.titulo}><b>{g.titulo}:</b> Não informado.</li>)}</ul>
      </DashboardSection> : grupos.map((g) => (
        <DashboardSection key={g.titulo} title={`${g.titulo} (${fmtNum(g.linhas.length)})`}>
          {g.linhas.length === 0 ? <p className="bi-body" style={cinza}>Não informado: nenhum registro.</p>
            : <ul className="bi-body flex flex-col gap-1">{g.linhas.map((l) => <li key={l}>{l}</li>)}</ul>}
        </DashboardSection>
      ))}
      {divergencias.length > 0 && (
        <DashboardSection title="Divergências">
          <ul className="bi-body flex flex-col gap-1" style={{ color: "var(--ds-color-danger)" }}>{divergencias.map((d) => <li key={d}>{d}</li>)}</ul>
        </DashboardSection>
      )}
    </div>
  );
}
