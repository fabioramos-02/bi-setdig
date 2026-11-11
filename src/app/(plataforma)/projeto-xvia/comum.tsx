/** Peças repetidas da página Projeto X-VIA: link do item, sigla explicada, valor com
 * situação do dado e a cor de cada tom. Um lugar só, para as abas falarem igual. */
import { fmtNum, fmtReais, linkTfs, type StatusDado, type TfsItem, type ValorFonte } from "@/lib/tfs";

export type Tom = "ok" | "atencao" | "critico" | "info" | "neutro";
export const COR: Record<Tom, string> = {
  ok: "var(--ds-color-success)",
  atencao: "var(--ds-color-warning, #d97706)",
  critico: "var(--ds-color-danger)",
  info: "var(--ds-color-primary-600)",
  neutro: "var(--ds-color-text-muted)",
};
export const cinza = { color: "var(--ds-color-text-muted)" };
export const NI = "Não informado";

/** "#id título" com link para o TFS. */
export function LinkItem({ item, semTitulo }: { item: Pick<TfsItem, "id" | "titulo">; semTitulo?: boolean }) {
  return (
    <a href={linkTfs(item.id)} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>
      #{item.id}{semTitulo ? "" : ` ${item.titulo}`}
    </a>
  );
}

/** Siglas que aparecem na tela, em linguagem simples (prompt do painel, item 8). */
export const GLOSSARIO = {
  UST: "Unidade de Serviço Técnico: a unidade em que o contrato mede e paga os serviços de customização (R$ 154,61 cada).",
  TR: "Termo de Referência: o documento que define o que o contrato compra, quanto e quando.",
  ETP: "Estudo Técnico Preliminar: a estimativa de quantas UST cada atividade vai consumir.",
  OS: "Ordem de Serviço: o pedido formal do Estado para a X-VIA executar um serviço.",
  SGD: "Superintendência de Governo Digital: a equipe do Estado que acompanha o contrato.",
  "X-VIA": "A empresa contratada (Contrato 004/2026).",
  homologação: "Etapa em que o órgão testa a entrega antes de ela ir para produção.",
} as const;

export function Sigla({ s, children }: { s: keyof typeof GLOSSARIO; children?: React.ReactNode }) {
  return <abbr title={GLOSSARIO[s]} style={{ textDecoration: "underline dotted", cursor: "help" }}>{children ?? s}</abbr>;
}

const ROTULO_STATUS: Record<StatusDado, string> = { confirmado: "confirmado", calculado: "calculado", ausente: "sem registro", divergente: "divergente" };
const COR_STATUS: Record<StatusDado, string> = { confirmado: COR.ok, calculado: COR.info, ausente: COR.neutro, divergente: COR.critico };

/** Valor da cadeia financeira: número, ou "Não informado"; sempre com a situação e a fonte. */
export function ValorStatus({ v, ust }: { v: ValorFonte; ust?: boolean }) {
  const texto = v.valor === null ? NI : ust ? `${fmtNum(v.valor)} UST` : fmtReais(v.valor);
  return (
    <span title={`Fonte: ${v.fonte}`} className="inline-flex flex-col items-end">
      <span style={v.valor === null ? cinza : undefined}>{texto}</span>
      <span className="text-[11px]" style={{ color: COR_STATUS[v.status] }}>{ROTULO_STATUS[v.status]}</span>
    </span>
  );
}

/** Seção numerada do relatório mensal: título como pergunta, conteúdo curto. */
export function SecaoRelatorio({ n, titulo, children, acao }: { n: number; titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="break-inside-avoid" style={{ borderTop: "1px solid var(--ds-color-border)", paddingTop: 16 }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="font-semibold" style={{ color: "var(--ds-color-text-primary)", fontSize: "1.05rem", lineHeight: 1.4, margin: 0 }}>
          <span style={cinza}>{n}.</span> {titulo}
        </h2>
        {acao}
      </div>
      <div className="text-sm flex flex-col gap-2" style={{ color: "var(--ds-color-text-primary)" }}>{children}</div>
    </section>
  );
}

export function BotaoLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-medium underline print:hidden" style={{ color: "var(--ds-color-primary-600)" }}>
      {children}
    </button>
  );
}
