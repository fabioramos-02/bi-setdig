"use client";

import { Modal } from "@/components/dashboard/Modal";
import {
  DONO_DESCONHECIDO,
  dataBR,
  inventariosDoSistema,
  pendenciasDoSistema,
  type Indicacao,
  type InventarioDeOrigem,
  type MetaInventario,
  type Pendencia,
  type Sistema,
} from "@/lib/inventario-sistemas";
import { Chips, corTexto } from "./Comuns";

/** Ficha individual do sistema: dados gerais, uso pelos órgãos, criticidade e
 * de onde veio cada informação. Abre de qualquer aba. */
export function FichaSistema({
  sistema,
  pendencias,
  indicacoes,
  meta,
  onClose,
}: {
  sistema: Sistema | null;
  pendencias: Pendencia[];
  indicacoes: Indicacao[];
  meta: MetaInventario | null;
  onClose: () => void;
}) {
  const s = sistema;
  const pend = s ? pendenciasDoSistema(s, pendencias) : [];
  return (
    <Modal
      open={!!s}
      onClose={onClose}
      title={s?.nome ?? ""}
      subtitulo={s ? [s.sigla, s.orgaoResponsavel].filter(Boolean).join(" · ") : undefined}
      largura={680}
    >
      {s && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <Destaque rotulo="Órgão responsável" valor={s.orgaoResponsavel === DONO_DESCONHECIDO ? "A identificar" : s.orgaoResponsavel} />
            <Destaque rotulo="Outros órgãos que usam" valor={s.nOrgaosQueUsam.toLocaleString("pt-BR")} />
          </div>

          <Secao titulo="Dados gerais">
            <Campo rotulo="Descrição" valor={s.descricao} />
            <Campo rotulo="Gestor do sistema" valor={s.gestor} />
            <Campo rotulo="Setor responsável" valor={s.setor} />
            <Campo rotulo="Contato do gestor" valor={s.temContato ? "Informado na planilha de origem" : null} />
            <Campo rotulo="Empresa que opera" valor={s.operadora} />
          </Secao>

          <Secao titulo="Utilização pelos órgãos">
            <p className="bi-caption mb-2" style={{ color: corTexto.secundario }}>
              Órgãos que disseram usar este sistema no inventário deles
              {s.nIndicacoes > s.nOrgaosQueUsam ? ` (citado ${s.nIndicacoes} vezes, alguns órgãos listaram por área ou módulo)` : ""}.
              Uso declarado não confirma troca de dados entre sistemas.
            </p>
            <Chips itens={s.orgaosQueUsam} vazio="Nenhum outro órgão disse usar este sistema." />
          </Secao>

          <Secao titulo="Criticidade">
            {s.criticidade ? (
              <p className="bi-body-small" style={{ color: corTexto.primario }}>
                Nível {s.criticidade.nivel} · <strong>{s.criticidade.rotulo}</strong> ({s.pct}% · {s.pontos} de 8 critérios)
                {s.dataAvaliacao ? `, avaliado em ${dataBR(s.dataAvaliacao)}` : ""}.
              </p>
            ) : (
              <p className="bi-body-small" style={{ color: corTexto.secundario }}>
                Avaliação pendente
                {s.criteriosRespondidos > 0 ? ` (${s.criteriosRespondidos} de 8 perguntas respondidas)` : ""}.
              </p>
            )}
            {s.criteriosRespondidos > 0 && meta && (
              <ul className="mt-2 flex flex-col gap-1">
                {meta.criterios.map((c) => (
                  <li key={c.id} className="bi-caption flex gap-2" style={{ color: corTexto.secundario }}>
                    <strong style={{ color: corTexto.primario, minWidth: 36 }}>{s.criterios[c.id] === "S" ? "Sim" : s.criterios[c.id] === "N" ? "Não" : "—"}</strong>
                    {c.pergunta}
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="De onde vem a informação">
            <Campo rotulo="Quem definiu o órgão responsável" valor={s.fonteDono} />
            <Campo rotulo="Responsável citado pelos órgãos" valor={s.responsavelInformado} />
            <Campo rotulo="Abrangência" valor={s.origem} />
            <InventariosDeOrigem arvore={inventariosDoSistema(s, indicacoes)} dono={s.orgaoResponsavel} />
            {pend.length > 0 && (
              <div className="mt-3">
                <span className="bi-label" style={{ color: "var(--ds-color-warning)" }}>Pendências de validação</span>
                <ul className="mt-1 flex flex-col gap-1">
                  {pend.map((p) => (
                    <li key={p.tipo + p.item} className="bi-body-small" style={{ color: corTexto.primario }}>
                      <strong>{p.tipo}:</strong> {p.oQueFalta}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Secao>
        </div>
      )}
    </Modal>
  );
}

/** Lista recolhida: ao clicar, abre a árvore órgão que informou → arquivo →
 * linha (com o nome como o órgão escreveu o sistema). Fechada por padrão para
 * não alongar a ficha. */
function InventariosDeOrigem({ arvore, dono }: { arvore: InventarioDeOrigem[]; dono: string }) {
  if (arvore.length === 0) return null;
  const nArquivos = new Set(arvore.flatMap((o) => o.arquivos.map((a) => a.arquivo))).size;
  const guia = { borderLeft: "1px solid var(--ds-color-border)" };
  return (
    <details className="mt-3 group">
      <summary
        className="bi-label cursor-pointer select-none inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-[var(--ds-color-background-muted)]"
        style={{ color: "var(--ds-color-primary-600)" }}
      >
        <span aria-hidden className="material-icons transition-transform group-open:rotate-90" style={{ fontSize: 18 }}>
          chevron_right
        </span>
        Inventários em que aparece
        <span style={{ color: corTexto.apoio, fontWeight: 400 }}>
          ({arvore.length} {arvore.length === 1 ? "órgão" : "órgãos"} · {nArquivos} {nArquivos === 1 ? "arquivo" : "arquivos"})
        </span>
      </summary>
      <ul className="mt-2 ml-2 pl-3 flex flex-col gap-3" style={guia}>
        {arvore.map((o) => (
          <li key={`${o.orgao}-${o.tipo}`}>
            <div className="bi-body-small" style={{ color: corTexto.primario }}>
              <strong>{o.orgao}</strong>{" "}
              <span className="bi-caption" style={{ color: corTexto.apoio }}>
                {o.orgao === dono
                  ? o.tipo === "proprio" ? "órgão responsável" : "órgão responsável · listou como sistema de outro órgão"
                  : o.tipo === "proprio" ? "declarou como sistema próprio" : "declarou que usa"}
              </span>
            </div>
            <ul className="mt-1 ml-1 pl-3 flex flex-col gap-1" style={guia}>
              {o.arquivos.map((a) => (
                <li key={a.arquivo}>
                  <div className="bi-caption break-words" style={{ color: corTexto.secundario }}>{a.arquivo}</div>
                  {a.linhas.length > 0 && (
                    <ul className="ml-1 pl-3" style={guia}>
                      {a.linhas.map((l, i) => (
                        <li key={`${l.linha}-${i}`} className="bi-caption" style={{ color: corTexto.apoio }}>
                          {l.linha ? `Linha ${l.linha}` : "Linha não informada"}
                          {l.nomeComoVeio ? ` · escrito como "${l.nomeComoVeio}"` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Destaque({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ border: "1px solid var(--ds-color-border)", borderRadius: "var(--ds-radius-md)", padding: "var(--ds-spacing-12)" }}>
      <div className="bi-label" style={{ color: corTexto.secundario }}>{rotulo}</div>
      <div className="bi-heading-2" style={{ color: "var(--ds-color-primary-600)" }}>{valor}</div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="bi-card-title mb-2" style={{ color: corTexto.primario }}>{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3 py-1">
      <span className="bi-label sm:w-56 shrink-0" style={{ color: corTexto.secundario }}>{rotulo}</span>
      <span className="bi-body-small" style={{ color: valor ? corTexto.primario : corTexto.apoio }}>
        {valor ?? "Não informado no inventário"}
      </span>
    </div>
  );
}
