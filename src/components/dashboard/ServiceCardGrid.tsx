"use client";

import { useState } from "react";
import type { PerfilServicoCard } from "@/lib/data";

/**
 * Grid "Serviços em destaque" — réplica fiel do card do portal www.ms.gov.br.
 * Estrutura baseada no portal; tipografia adaptada aos papéis do BI para
 * leitura confortável, com apoio mínimo de 14px. Abas por perfil +
 * cards em 2 colunas; ordem preservada (a do portal), sem reordenar por visita.
 */

export const PORTAL_BASE_URL = "https://www.ms.gov.br";

// Ordem e rótulos do portal.
const PERFIS: { code: string; label: string }[] = [
  { code: "CIDADAO", label: "Cidadão" },
  { code: "SERVIDOR_PUBLICO", label: "Servidor Público" },
  { code: "EMPRESA", label: "Empresa" },
  { code: "GESTAO_PUBLICA", label: "Gestão Pública" },
];

export function ServiceCardGrid({ servicosPorPerfil }: { servicosPorPerfil: Record<string, PerfilServicoCard[]> }) {
  const [perfilAtivo, setPerfilAtivo] = useState("CIDADAO");
  const perfis = PERFIS.filter((p) => (servicosPorPerfil[p.code]?.length ?? 0) > 0);
  const cards = servicosPorPerfil[perfilAtivo] ?? [];

  return (
    <div>
      {/* Barra de perfil (célula ativa preenchida, estilo portal) */}
      <div
        className="flex flex-nowrap overflow-x-auto rounded w-max max-w-full mb-5"
        style={{ border: "1px solid var(--ds-color-border)" }}
        role="tablist"
        aria-label="Filtrar serviços por perfil"
      >
        {perfis.map((p, i) => {
          const ativo = p.code === perfilAtivo;
          return (
            <button
              key={p.code}
              role="tab"
              aria-selected={ativo}
              onClick={() => setPerfilAtivo(p.code)}
              className="shrink-0 whitespace-nowrap text-sm font-bold uppercase tracking-tight px-4 py-2.5 transition-colors"
              style={{
                background: ativo ? "var(--ds-color-primary-600)" : "var(--ds-color-background)",
                color: ativo ? "var(--ds-color-text-inverse)" : "var(--ds-color-primary-600)",
                borderLeft: i === 0 ? "none" : "1px solid var(--ds-color-border)",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((c) => (
          <ServiceCard key={c.path} card={c} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ card }: { card: PerfilServicoCard }) {
  return (
    <a
      href={`${PORTAL_BASE_URL}${card.path}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center rounded p-4 transition-shadow hover:shadow-md break-inside-avoid"
      style={{ background: "var(--ds-color-background)", boxShadow: "0 0 3px rgba(0,0,0,0.16)" }}
    >
      <span
        className="material-icons shrink-0 flex items-center justify-center"
        style={{ color: "var(--ds-color-primary-600)", fontSize: 38, lineHeight: 1, width: 56 }}
        aria-hidden
      >
        {card.icone}
      </span>
      <div className="flex-1 min-w-0">
        {card.orgao && (
          <p
            className="uppercase tracking-wide"
            style={{
              color: "var(--ds-color-primary-600)",
              fontFamily: "var(--ds-font-family-body)",
              fontSize: "var(--ds-bi-caption-size)",
              fontWeight: 400,
              marginBottom: 5,
            }}
          >
            {card.orgao}
          </p>
        )}
        <h3
          className="leading-snug"
          style={{
            color: "var(--ds-color-text-secondary)",
            fontFamily: "var(--ds-font-family-body)",
            fontSize: "var(--ds-bi-card-title-size)",
            fontWeight: "var(--ds-bi-weight-emphasis)",
          }}
        >
          {card.servico}
        </h3>
      </div>
      {/* Visitas do período no canto — reage ao filtro (dado vem do slice por período). */}
      <div className="shrink-0 text-right pl-3">
        <div
          style={{ color: "var(--ds-color-primary-600)", fontFamily: "var(--ds-font-family-body)", fontSize: "var(--ds-bi-headline-size)", fontWeight: "var(--ds-bi-weight-emphasis)", lineHeight: 1.25 }}
        >
          {card.visitas.toLocaleString("pt-BR")}
        </div>
        <div style={{ color: "var(--ds-color-text-secondary)", fontSize: "var(--ds-bi-caption-size)", marginTop: 2 }}>visitas</div>
      </div>
    </a>
  );
}
