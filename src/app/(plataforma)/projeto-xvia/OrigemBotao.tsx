"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/dashboard/Modal";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { fmtNum, linkTfs, quemResolve, type Origem, type TfsItem } from "@/lib/tfs";

const POR_GRUPO = 200;
const cinza = { color: "var(--ds-color-text-muted)" };

const chave = (i: TfsItem, por: Origem["agruparPor"]) =>
  por === "orgao" ? i.orgao ?? "Sem órgão identificado" : por === "coluna" ? i.coluna ?? i.estado : i.epico ?? "Sem módulo";

/** "De onde vem?" — o número, a conta que chega nele, a fonte e os itens do TFS por trás,
 * agrupados com subtotal. Se o Secretário questionar um número, o gerente chega ao registro
 * em um clique. O conteúdo só é montado com o modal aberto (há dezenas de botões na página). */
export function OrigemBotao({ origem }: { origem: Origem }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="text-xs font-medium underline print:hidden" style={{ color: "var(--ds-color-primary-600)" }}>
        De onde vem?
      </button>
      <Modal open={aberto} onClose={() => setAberto(false)} title={origem.numero ?? origem.rotulo} subtitulo={origem.numero ? origem.rotulo : undefined} largura={origem.itens?.length ? 880 : 560}>
        {aberto && <Detalhe origem={origem} />}
      </Modal>
    </>
  );
}

function Detalhe({ origem }: { origem: Origem }) {
  const [busca, setBusca] = useState("");
  const itens = useMemo(() => origem.itens ?? [], [origem.itens]);
  const valor = origem.valor;
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? itens.filter((i) => String(i.id).includes(q) || i.titulo.toLowerCase().includes(q) || (i.responsavel ?? "").toLowerCase().includes(q)) : itens;
  }, [itens, busca]);
  const grupos = useMemo(() => {
    const m = new Map<string, TfsItem[]>();
    for (const i of filtrados) {
      const k = chave(i, origem.agruparPor);
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    return [...m]
      .map(([nome, lista]) => ({ nome, lista, subtotal: valor ? lista.reduce((s, i) => s + (valor.de(i) ?? 0), 0) : null }))
      .sort((a, b) => (b.subtotal ?? b.lista.length) - (a.subtotal ?? a.lista.length));
  }, [filtrados, origem.agruparPor, valor]);
  const passos = origem.passos ?? [];

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Como chegamos neste número" style={{ background: "var(--ds-color-background-muted)", borderRadius: "var(--ds-radius-md)", padding: "14px 16px" }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={cinza}>Como chegamos neste número</div>
        {passos.length ? (
          <ol className="flex flex-col gap-1.5 text-sm">
            {passos.map((p, n) => (
              <li key={p} className="flex gap-2" style={{ color: "var(--ds-color-text-primary)", fontWeight: n === passos.length - 1 ? 600 : 400 }}>
                <span aria-hidden className="shrink-0 text-center" style={{ ...cinza, width: 18 }}>{n === 0 ? "•" : "→"}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-sm">{origem.detalhe}</div>
        )}
        {passos.length > 0 && origem.detalhe && <div className="text-xs mt-2" style={cinza}>{origem.detalhe}</div>}
        {origem.fonte && <div className="text-xs mt-2" style={cinza}>Fonte: {origem.fonte}</div>}
        {origem.link && (
          <div className="text-sm mt-2">
            <a href={origem.link.href} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--ds-color-primary-600)" }}>{origem.link.texto}</a>
          </div>
        )}
      </section>

      {itens.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex-1 min-w-[200px]">
              <span className="sr-only">Buscar item</span>
              <input
                type="search"
                data-autofocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={`Buscar entre ${fmtNum(itens.length)} itens (número, título ou responsável)`}
                className="w-full text-sm"
                style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-sm)", padding: "8px 10px", background: "var(--ds-color-background)", color: "var(--ds-color-text-primary)" }}
              />
            </label>
            <ExportCsvButton
              filename={`${origem.rotulo.normalize("NFD").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 50)}.csv`}
              rows={filtrados.map((i) => ({ id: i.id, titulo: i.titulo, grupo: chave(i, origem.agruparPor), situacao: i.coluna ?? i.estado, responsavel: quemResolve(i), ...(valor ? { [valor.rotulo]: valor.de(i) ?? "" } : {}), link: linkTfs(i.id) }))}
            />
          </div>
          <div className="text-xs" style={cinza} aria-live="polite">
            {fmtNum(filtrados.length)} {filtrados.length === 1 ? "item" : "itens"} em {fmtNum(grupos.length)} {grupos.length === 1 ? "grupo" : "grupos"}
            {valor ? ` · ${fmtNum(grupos.reduce((s, g) => s + (g.subtotal ?? 0), 0))} ${valor.rotulo}` : ""}
          </div>
          <div className="flex flex-col gap-2">
            {grupos.map((g, n) => (
              <details key={g.nome} open={n === 0 || grupos.length <= 3 || !!busca} style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)" }}>
                <summary className="cursor-pointer flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                  <b style={{ color: "var(--ds-color-text-primary)" }}>{g.nome}</b>
                  <span className="tabular-nums" style={cinza}>
                    {fmtNum(g.lista.length)} {g.lista.length === 1 ? "item" : "itens"}
                    {g.subtotal !== null && valor ? ` · ${fmtNum(g.subtotal)} ${valor.rotulo}` : ""}
                  </span>
                </summary>
                <ul className="text-sm">
                  {g.lista.slice(0, POR_GRUPO).map((i) => {
                    const v = valor?.de(i);
                    return (
                      <li key={i.id} className="grid gap-x-3 px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_9rem_11rem_4.5rem]" style={{ borderTop: "1px solid var(--ds-color-border)" }}>
                        <span className="min-w-0">
                          <a href={linkTfs(i.id)} target="_blank" rel="noreferrer" className="underline tabular-nums" style={{ color: "var(--ds-color-primary-600)" }}>#{i.id}</a>{" "}
                          <span style={{ color: "var(--ds-color-text-primary)" }}>{i.titulo}</span>
                        </span>
                        <span className="text-xs sm:text-sm" style={cinza}>{i.coluna ?? i.estado}</span>
                        <span className="text-xs sm:text-sm truncate" style={cinza} title={quemResolve(i)}>{i.responsavel ?? "sem responsável"}</span>
                        <span className="text-xs sm:text-sm sm:text-right tabular-nums font-medium">{valor ? (v == null ? "—" : `${fmtNum(v)} ${valor.rotulo}`) : ""}</span>
                      </li>
                    );
                  })}
                  {g.lista.length > POR_GRUPO && <li className="px-3 py-1.5 text-xs" style={cinza}>+{fmtNum(g.lista.length - POR_GRUPO)} itens no CSV.</li>}
                </ul>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
