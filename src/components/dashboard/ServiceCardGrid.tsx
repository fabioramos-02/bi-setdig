"use client";

import { useState } from "react";
import type { PerfilServicoCard } from "@/lib/data";

/**
 * Grid "Serviços em destaque" — réplica fiel do card do portal www.ms.gov.br.
 * Estrutura e estilos (ícone Material Icons 38px azul, órgão em caixa alta
 * 10px, título 16px bold cinza, sombra suave sem borda) confirmados via
 * inspeção DOM ao vivo do portal, temados por var(--ds-*). Abas por perfil +
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
        className="inline-flex flex-wrap rounded overflow-hidden mb-5"
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
              className="text-sm font-bold uppercase tracking-tight px-5 py-3 transition-colors"
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
              fontSize: "0.625rem",
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
            fontSize: "1rem",
            fontWeight: 700,
          }}
        >
          {card.servico}
        </h3>
      </div>
    </a>
  );
}
