"use client";

import type { ReactNode } from "react";
import { linkTfs, type Origem, type TfsItem } from "@/lib/tfs";
import { COR } from "./comum";

/**
 * Peças da leitura executiva do "De onde vem?" (OrigemBotao): Destaque (o número uma vez
 * só + o achado) → Barra contra a referência → Ranking em que cada grupo abre os itens →
 * avisos e fontes em etiquetas. Só tokens do DS; os fundos suaves saem de color-mix, o que
 * acompanha o tema escuro sem token novo.
 */
export const tinta = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`;
const AZUL = COR.info;
const T = {
  pri: { color: "var(--ds-color-text-primary)" },
  sec: { color: "var(--ds-color-text-secondary)" },
  mut: { color: "var(--ds-color-text-muted)" },
};
const borda = "1px solid var(--ds-color-border)";

export function Icone({ nome, cor, tamanho = 18 }: { nome: string; cor?: string; tamanho?: number }) {
  return <span aria-hidden className="material-icons shrink-0" style={{ fontSize: tamanho, lineHeight: 1, color: cor }}>{nome}</span>;
}

function Barra({ barra }: { barra: NonNullable<Origem["barra"]> }) {
  const { total, segmentos, marcador, legenda } = barra;
  const largura = (v: number) => (total ? Math.max((v / total) * 100, v > 0 ? 1 : 0) : 0);
  return (
    <div>
      <div className="flex justify-between gap-2 bi-caption mb-1" style={T.sec}>
        <span>{barra.esquerda}</span>
        {barra.direita && <span className="hidden sm:inline tabular-nums">{barra.direita}</span>}
      </div>
      <div className="relative h-2 w-full" role="img" aria-label={segmentos.map((s) => `${s.rotulo}: ${s.valor}`).join("; ")}>
        <div className="flex h-full w-full overflow-hidden" style={{ background: tinta(AZUL, 15), borderRadius: 9999 }}>
          {segmentos.map((s) => <div key={s.rotulo} className="h-full" style={{ width: `${largura(s.valor)}%`, background: COR[s.tom] }} />)}
        </div>
        {marcador && (
          <div className="absolute -top-1 -bottom-1 w-[3px]" style={{ left: `calc(${Math.min(marcador.pct, 100)}% - 1px)`, background: "var(--ds-color-text-primary)", borderRadius: 2 }} title={marcador.rotulo} />
        )}
      </div>
      {(legenda || marcador) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 bi-caption" style={T.sec}>
          {legenda && segmentos.map((s) => (
            <span key={s.rotulo} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: COR[s.tom] }} />
              {s.rotulo} <strong className="tabular-nums" style={T.pri}>{s.valor.toLocaleString("pt-BR")}</strong>
            </span>
          ))}
          {marcador && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="w-[3px] h-3" style={{ background: "var(--ds-color-text-primary)", borderRadius: 2 }} />
              {marcador.rotulo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** O número uma vez só, o achado e a barra contra a referência. */
export function Destaque({ destaque, barra }: { destaque: NonNullable<Origem["destaque"]>; barra?: Origem["barra"] }) {
  const cor = COR[destaque.tom];
  return (
    <section className="flex flex-col gap-4 p-4 sm:p-5" style={{ background: tinta(AZUL, 7), border: `1px solid ${tinta(AZUL, 20)}`, borderRadius: "var(--ds-radius-md)" }}>
      <div className="flex items-start gap-3">
        <span className="hidden sm:flex items-center justify-center w-11 h-11 shrink-0" style={{ background: tinta(cor, 15), borderRadius: 9999 }}>
          <Icone nome={destaque.icone} cor={cor} tamanho={24} />
        </span>
        <div className="min-w-0">
          <span className="bi-caption uppercase tracking-wide font-semibold" style={T.sec}>{destaque.rotulo}</span>
          <p className="font-semibold tabular-nums" style={{ ...T.pri, fontSize: "var(--ds-bi-metric-size)", lineHeight: 1.15 }}>{destaque.valor}</p>
          {destaque.achado && <p className="bi-body mt-1" style={T.pri}>{destaque.achado}</p>}
        </div>
      </div>
      {barra && <Barra barra={barra} />}
    </section>
  );
}

/** Itens de um grupo, com link para o registro no TFS e o valor da coluna numérica. */
export function ListaItens({ itens, valor, meta, vazio = "Nenhum item." }: {
  itens: TfsItem[]; valor?: Origem["valor"]; meta: (i: TfsItem) => (string | null | undefined | false)[]; vazio?: string;
}) {
  if (!itens.length) return <p className="bi-body mt-3 pl-3" style={T.mut}>{vazio}</p>;
  return (
    <ul className="mt-3 ml-1 sm:ml-2 max-h-[40vh] overflow-y-auto" style={{ borderLeft: `2px solid ${tinta(AZUL, 25)}` }}>
      {itens.map((i) => {
        const v = valor?.de(i);
        return (
          <li key={i.id} className="flex items-start justify-between gap-3 pl-3 pr-1 py-2">
            <div className="min-w-0">
              <p className="bi-body" style={T.pri}>{i.titulo}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 bi-caption" style={T.mut}>
                <a href={linkTfs(i.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium underline" style={{ color: AZUL }}>
                  #{i.id}<Icone nome="open_in_new" tamanho={12} />
                </a>
                {meta(i).filter(Boolean).map((m, k) => <span key={k}>· {m}</span>)}
              </div>
            </div>
            {valor && v != null && (
              <span className="bi-caption font-semibold tabular-nums shrink-0 px-2 py-0.5 whitespace-nowrap" style={{ background: "var(--ds-color-background-muted)", borderRadius: 9999, ...T.sec }}>
                {v.toLocaleString("pt-BR")} {valor.rotulo}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Ranking em que cada linha abre os itens que a compõem. */
export function Ranking({ grupos, abertos, conteudo }: {
  grupos: NonNullable<Origem["grupos"]>; abertos: boolean; conteudo: (g: NonNullable<Origem["grupos"]>["lista"][number]) => ReactNode;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 mb-1" style={{ ...T.pri, fontSize: "var(--ds-bi-body-size)", fontWeight: 600, lineHeight: 1.3 }}>
        <Icone nome="leaderboard" cor={AZUL} />
        {grupos.titulo}
      </h3>
      <p className="bi-caption mb-2" style={T.mut}>{grupos.dica}</p>
      <ol className="flex flex-col gap-1.5">
        {grupos.lista.map((g) => {
          const cor = COR[g.tom ?? "info"];
          return (
            <li key={g.chave}>
              <details open={abertos || undefined} className="group p-3" style={{ borderRadius: "var(--ds-radius-sm)", background: g.destaque ? tinta(cor, 6) : "transparent", border: g.destaque ? `1px solid ${tinta(cor, 18)}` : borda }}>
                <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2">
                      {g.etiqueta && <span className="bi-caption font-semibold px-2 py-0.5 shrink-0 tabular-nums" style={{ background: tinta(cor, 12), color: "var(--ds-color-text-primary)", borderRadius: 9999 }}>{g.etiqueta}</span>}
                      <span className="bi-body" style={T.pri}>{g.nome}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="bi-body font-semibold tabular-nums" style={T.pri}>{g.valor}</span>
                      <span className="transition-transform group-open:rotate-180"><Icone nome="expand_more" cor={AZUL} /></span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-2">
                    <div className="h-1.5 sm:flex-1 overflow-hidden" style={{ background: "var(--ds-color-background-muted)", borderRadius: 9999 }}>
                      <div className="h-full" style={{ width: `${g.barra > 0 ? Math.max(g.barra, 2) : 0}%`, background: cor, opacity: g.destaque ? 1 : 0.6, borderRadius: 9999 }} />
                    </div>
                    <span className="bi-caption tabular-nums sm:shrink-0 sm:text-right" style={T.mut}>{g.legenda}</span>
                  </div>
                </summary>
                {conteudo(g)}
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Avisos do dado e a fonte em etiquetas (a fonte vem separada por " · "). */
export function Rodape({ avisos, fonte }: { avisos?: Origem["avisos"]; fonte?: string }) {
  if (!avisos?.length && !fonte) return null;
  return (
    <footer className="flex flex-col gap-3 pt-4" style={{ borderTop: borda }}>
      {avisos?.map((a) => {
        const cor = a.tom === "critico" ? COR.critico : COR.atencao;
        return (
          <p key={a.texto} className="flex items-start gap-2 bi-caption p-3" style={{ background: tinta(cor, 14), borderRadius: "var(--ds-radius-sm)", ...T.pri }}>
            <Icone nome={a.tom === "critico" ? "error_outline" : "info"} cor={cor} tamanho={16} />
            <span>{a.texto}</span>
          </p>
        );
      })}
      {fonte && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="bi-caption font-semibold" style={T.mut}>Fontes</span>
          {fonte.split(" · ").map((e) => (
            <span key={e} className="bi-caption px-2 py-1" style={{ border: borda, borderRadius: 9999, ...T.sec }}>{e}</span>
          ))}
        </div>
      )}
    </footer>
  );
}
