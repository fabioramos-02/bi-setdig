import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { NIVEIS, NIVEL_TOPO, type MatrizCenso, type Prioridade, type Quadrante } from "@/lib/censo";
import { NivelBadge } from "./NivelBadge";

/** Ordem de leitura = ordem do grid (cima-esquerda → baixo-direita) e da pilha
 * no celular: o que fazer primeiro vem primeiro. */
const QUADRANTES: { chave: Quadrante; titulo: string; acao: string; cor: string }[] = [
  {
    chave: "rapido", titulo: "Alto impacto, baixo esforço", cor: "var(--ds-color-success)",
    acao: "Muito procurados e já quase digitais: completar ou automatizar primeiro.",
  },
  {
    chave: "estruturante", titulo: "Alto impacto, alto esforço", cor: "var(--ds-color-info)",
    acao: "Muito procurados, mas ainda dependem do balcão: projeto maior, alto retorno.",
  },
  {
    chave: "oportuno", titulo: "Baixo impacto, baixo esforço", cor: "var(--ds-color-tertiary-600)",
    acao: "Pouco procurados e quase digitais: ajustes quando houver fôlego.",
  },
  {
    chave: "evitar", titulo: "Baixo impacto, alto esforço", cor: "var(--ds-color-error)",
    acao: "Pouco procurados e longe do digital: deixe para depois.",
  },
];

const VISIVEIS = 5;
const compacto = (v: number) => v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Matriz impacto × esforço em 4 quadrantes. Esforço = nível (quanto menor,
 * mais falta digitalizar); impacto = pedidos por mês acima da mediana do
 * recorte. Cada quadrante mostra a mistura de níveis numa faixa e quantos já
 * estão no nível 5 — o 5 entra na matriz, mas não há mais o que transformar. */
export function MatrizImpactoEsforco({
  matriz,
  recorte,
  mostrarOrgao = true,
}: {
  matriz: MatrizCenso;
  recorte: "governo" | "órgão";
  mostrarOrgao?: boolean;
}) {
  const total = Object.values(matriz.quadrantes).reduce((s, q) => s + q.length, 0);
  if (total === 0) return null;
  const nTopo = Object.values(matriz.quadrantes).flat().filter((c) => c.nivel === NIVEL_TOPO).length;
  const foraDaMatriz = matriz.semDemanda + matriz.semNivel;

  return (
    <DashboardSection title="Onde investir: impacto × esforço">
      <p className="text-sm mb-1 max-w-[75ch]" style={{ color: "var(--ds-color-text-secondary)" }}>
        Cada serviço está posicionado pelo esforço para digitalizar (quanto menor o nível, maior o esforço: níveis 0 a 2
        são alto esforço) e pelo impacto, medido em pedidos por mês. Alto impacto = mais de{" "}
        <strong style={{ color: "var(--ds-color-text-primary)" }}>{compacto(matriz.mediana)} pedidos por mês</strong>, o
        valor do meio entre os serviços {recorte === "governo" ? "do governo" : "deste órgão"}.
      </p>
      <p className="text-sm mb-5 max-w-[75ch]" style={{ color: "var(--ds-color-text-secondary)" }}>
        {nTopo > 0
          ? <><strong style={{ color: "var(--ds-color-text-primary)" }}>{nTopo.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")}</strong> já estão no nível 5, online e automáticos — aparecem na matriz, mas não há mais etapa a transformar.</>
          : "Nenhum serviço daqui está no nível 5 (online e automático) ainda."}
      </p>

      <div className="lg:grid lg:grid-cols-[auto_1fr] lg:gap-x-3">
        {/* eixo vertical — só no desktop; no celular cada quadrante se nomeia */}
        <div className="hidden lg:flex items-center justify-center" aria-hidden>
          <span className="text-xs font-semibold whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: "var(--ds-color-text-muted)" }}>
            Impacto (pedidos por mês) →
          </span>
        </div>
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 min-w-0">
          {QUADRANTES.map((q) => (
            <QuadranteCard key={q.chave} {...q} itens={matriz.quadrantes[q.chave]} mostrarOrgao={mostrarOrgao} />
          ))}
        </div>
        <div className="hidden lg:block" />
        <div className="hidden lg:block text-right text-xs font-semibold mt-2" style={{ color: "var(--ds-color-text-muted)" }} aria-hidden>
          Esforço para digitalizar →
        </div>
      </div>

      {foraDaMatriz > 0 && (
        <p className="mt-4 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
          {foraDaMatriz.toLocaleString("pt-BR")} {foraDaMatriz === 1 ? "serviço ficou" : "serviços ficaram"} fora da matriz porque o
          órgão não informou {matriz.semNivel && matriz.semDemanda ? "o grau ou um número de pedidos por mês" : matriz.semNivel ? "o grau" : "um número de pedidos por mês"}.
        </p>
      )}
    </DashboardSection>
  );
}

function QuadranteCard({
  titulo, acao, cor, itens, mostrarOrgao,
}: {
  titulo: string; acao: string; cor: string; itens: Prioridade[]; mostrarOrgao: boolean;
}) {
  const nTopo = itens.filter((c) => c.nivel === NIVEL_TOPO).length;
  const resto = itens.slice(VISIVEIS);

  return (
    <section
      className="flex flex-col min-w-0 rounded-md overflow-hidden"
      style={{ border: `1px solid ${cor}`, background: `color-mix(in srgb, ${cor} 6%, var(--ds-color-background))` }}
      aria-label={`${titulo}: ${itens.length} serviços`}
    >
      <header className="px-4 pt-3 pb-3" style={{ background: `color-mix(in srgb, ${cor} 16%, var(--ds-color-background))` }}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 style={{ color: "var(--ds-color-text-primary)", fontSize: "1rem", fontWeight: 700, margin: 0 }}>{titulo}</h3>
          <span className="shrink-0 text-2xl font-bold leading-none" style={{ color: cor }}>{itens.length.toLocaleString("pt-BR")}</span>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--ds-color-text-secondary)" }}>{acao}</p>
        <FaixaNiveis itens={itens} />
        <p className="text-xs mt-1" style={{ color: "var(--ds-color-text-muted)" }}>
          {nTopo > 0 ? `${nTopo.toLocaleString("pt-BR")} já no nível 5` : "nenhum no nível 5"}
        </p>
      </header>

      {itens.length === 0 ? (
        <p className="px-4 py-3 text-sm" style={{ color: "var(--ds-color-text-muted)" }}>Nenhum serviço neste quadrante.</p>
      ) : (
        <div className="px-4 py-2">
          <Lista itens={itens.slice(0, VISIVEIS)} mostrarOrgao={mostrarOrgao} />
          {resto.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs font-semibold py-1" style={{ color: "var(--ds-color-primary-600)" }}>
                Ver todos ({itens.length.toLocaleString("pt-BR")})
              </summary>
              <Lista itens={resto} mostrarOrgao={mostrarOrgao} />
            </details>
          )}
        </div>
      )}
    </section>
  );
}

/** Mistura de níveis dentro do quadrante — uma barra fina na rampa da escala. */
function FaixaNiveis({ itens }: { itens: Prioridade[] }) {
  if (itens.length === 0) return null;
  const partes = NIVEIS.map((n) => ({ ...n, qtd: itens.filter((c) => c.nivel === n.nivel).length })).filter((n) => n.qtd > 0);
  return (
    <div
      className="flex h-1.5 rounded-full overflow-hidden mt-3"
      role="img"
      aria-label={partes.map((p) => `nível ${p.nivel}: ${p.qtd}`).join(", ")}
    >
      {partes.map((p) => (
        <div key={p.nivel} style={{ width: `${(p.qtd / itens.length) * 100}%`, background: p.cor }} title={`N${p.nivel} · ${p.rotulo}: ${p.qtd}`} />
      ))}
    </div>
  );
}

function Lista({ itens, mostrarOrgao }: { itens: Prioridade[]; mostrarOrgao: boolean }) {
  return (
    <ul className="flex flex-col">
      {itens.map((c) => (
        <li key={`${c.orgaoSigla}-${c.id}`} className="flex items-center gap-2 py-1.5 min-w-0" style={{ borderTop: "1px solid var(--ds-color-border)" }}>
          <NivelBadge nivel={c.nivel} compacto />
          <span className="flex-1 min-w-0 text-sm truncate" title={c.titulo}>
            {c.urlServico ? (
              <a href={c.urlServico} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--ds-color-text-primary)" }}>
                {c.titulo}
              </a>
            ) : (
              <span style={{ color: "var(--ds-color-text-primary)" }}>{c.titulo}</span>
            )}
          </span>
          {mostrarOrgao && (
            <span className="shrink-0 text-xs" style={{ color: "var(--ds-color-text-muted)" }}>{c.orgaoSigla}</span>
          )}
          <span className="shrink-0 w-14 text-right text-sm font-semibold tabular-nums" style={{ color: "var(--ds-color-text-secondary)" }}>
            {compacto(c.demandaMensal ?? 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}
