"use client";

import { useState } from "react";
import {
  Building2,
  Car,
  Coins,
  FileText,
  FlaskConical,
  HeartPulse,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PerfilServicoCard } from "@/lib/data";

/**
 * Grid "Serviços em destaque" — réplica do card do portal www.ms.gov.br
 * (bench-carta/src/ui/{cards,theme}.py), temada por var(--ds-*). Abas por perfil
 * + cards em 2 colunas; ordem preservada (a do portal), sem reordenar por visita.
 */

const PORTAL_BASE_URL = "https://www.ms.gov.br";

// Ordem e rótulos do portal.
const PERFIS: { code: string; label: string }[] = [
  { code: "CIDADAO", label: "Cidadão" },
  { code: "SERVIDOR_PUBLICO", label: "Servidor Público" },
  { code: "EMPRESA", label: "Empresa" },
  { code: "GESTAO_PUBLICA", label: "Gestão Pública" },
];

// categoriaSlug -> ícone lucide (equivalente aos Material Icons do portal).
const ICONE_CATEGORIA: Record<string, LucideIcon> = {
  "financas-e-impostos": Coins,
  "saude-e-cuidado": HeartPulse,
  "transito-e-transportes": Car,
  seguranca: ShieldCheck,
  "empresa-industria-e-comercio": Building2,
  "assistencia-social": Users,
  "ciencia-e-tecnologia": FlaskConical,
};

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
  const Icone = ICONE_CATEGORIA[card.categoriaSlug] ?? FileText;
  const corTipo = card.exclusivo ? "var(--ds-color-success)" : "var(--ds-color-primary-600)";
  return (
    <div
      className="flex gap-4 items-start rounded p-5 transition-shadow hover:shadow-md break-inside-avoid"
      style={{ border: "1px solid var(--ds-color-border)", background: "var(--ds-color-background)" }}
    >
      <Icone size={34} strokeWidth={1.75} style={{ color: "var(--ds-color-primary-600)", flex: "0 0 auto" }} aria-hidden />
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--ds-color-primary-600)" }}
        >
          {card.categoria}
        </div>
        <div className="font-bold mt-1 mb-3" style={{ color: "var(--ds-color-text-primary)" }}>
          {card.servico}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: "var(--ds-color-background-muted)", color: corTipo }}
          >
            {card.visitas.toLocaleString("pt-BR")} visitas
          </span>
          <span className="text-xs" style={{ color: "var(--ds-color-text-muted)" }}>
            {card.exclusivo ? "Exclusivo do perfil" : "Compartilhado"}
          </span>
          <a
            href={`${PORTAL_BASE_URL}${card.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold hover:underline ml-auto"
            style={{ color: "var(--ds-color-primary-600)" }}
          >
            abrir ↗
          </a>
        </div>
      </div>
    </div>
  );
}
