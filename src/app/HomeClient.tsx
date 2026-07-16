"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ds/ThemeToggle";

type Painel = {
  nome: string;
  rota: string;
  icone: string;
  descricao: string;
  cor: string;
  tags: string[];
};

type Dominio = {
  id: string;
  nome: string;
  paineis: Painel[];
};

const DOMINIOS: Dominio[] = [
  {
    id: "canais",
    nome: "Canais Digitais",
    paineis: [
      {
        nome: "Portal Único",
        rota: "/analytics/portal-ms",
        icone: "language",
        descricao: "Acessos e uso do ms.gov.br",
        cor: "var(--ds-color-primary-600)",
        tags: ["portal", "ms.gov.br", "acessos", "visitas"],
      },
      {
        nome: "MS Digital",
        rota: "/analytics/ms-digital",
        icone: "smartphone",
        descricao: "Uso do aplicativo MS Digital",
        cor: "var(--ds-color-primary-600)",
        tags: ["app", "celular", "mobile", "ms digital"],
      },
      {
        nome: "Sites",
        rota: "/sites",
        icone: "public",
        descricao: "Visitas aos sites do Governo",
        cor: "var(--ds-color-primary-600)",
        tags: ["sites", "secretarias", "fundações", "autarquias"],
      },
    ],
  },
  {
    id: "servicos",
    nome: "Serviços e Qualidade",
    paineis: [
      {
        nome: "Serviços",
        rota: "/servicos",
        icone: "assignment_turned_in",
        descricao: "Catálogo e serviços mais acessados",
        cor: "var(--ds-color-primary-600)",
        tags: ["serviços", "catálogo", "cidadão"],
      },
      {
        nome: "Avaliação da Carta",
        rota: "/qualidade",
        icone: "verified",
        descricao: "Erros reportados e satisfação",
        cor: "var(--ds-color-primary-600)",
        tags: ["qualidade", "avaliação", "erros", "satisfação", "feedback"],
      },
    ],
  },
  {
    id: "governanca",
    nome: "Governança Estratégica",
    paineis: [
      {
        nome: "Censo Digital",
        rota: "/censo-digital",
        icone: "account_balance",
        descricao: "Indicadores de transformação digital",
        cor: "var(--ds-color-primary-600)",
        tags: ["censo", "governança", "maturidade", "estratégico"],
      },
    ],
  },
];

export function HomeClient() {
  const [busca, setBusca] = useState("");

  const termo = busca.toLowerCase().trim();

  const dominiosFiltrados = DOMINIOS.map(d => ({
    ...d,
    paineis: d.paineis.filter(p =>
      p.nome.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo) ||
      p.tags.some(t => t.includes(termo))
    )
  })).filter(d => d.paineis.length > 0);

  const nenhumResultado = dominiosFiltrados.length === 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ds-color-background)" }}>
      <header
        style={{ background: "var(--ds-color-primary-600)" }}
        className="flex items-center justify-between px-4 sm:px-8 h-[88px] shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-ms-horizontal.svg" alt="Governo de Mato Grosso do Sul" className="h-7 sm:h-8 w-auto" />
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col px-4 sm:px-8 pt-12 pb-16 max-w-[1200px] mx-auto w-full relative">
        <DecoracaoFundo />

        <div className="flex flex-col items-center text-center mb-14 w-full relative z-10">
          <h1
            style={{ color: "var(--ds-color-text-primary)", fontFamily: "var(--ds-font-family-heading)" }}
            className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight"
          >
            Centro de Inteligência  SETDIG
          </h1>
          <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-base sm:text-lg mb-10 max-w-2xl">
            Explore os indicadores e painéis de dados da transformação digital do Governo de Mato Grosso do Sul.
          </p>

          <div className="relative w-full max-w-2xl group">
            <span
              className="material-icons absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300"
              style={{ color: busca ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)", fontSize: 26 }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Pesquisar painéis ou indicadores..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-14 pr-5 py-4 rounded-2xl outline-none transition-all duration-300 text-base sm:text-lg focus:-translate-y-1"
              style={{
                background: "var(--ds-color-background)",
                color: "var(--ds-color-text-primary)",
                border: "2px solid var(--ds-color-border)",
                boxShadow: "var(--ds-shadow-card-md)"
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <span style={{ color: "var(--ds-color-text-muted)" }} className="text-sm font-medium mr-1">
              Acessos Rápidos:
            </span>
            <Link
              href="/analytics/portal-ms"
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5"
              style={{
                background: "color-mix(in srgb, var(--ds-color-primary-600) 10%, transparent)",
                color: "var(--ds-color-primary-600)"
              }}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>language</span>
              Portal Único
            </Link>
            <Link
              href="/analytics/ms-digital"
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5"
              style={{
                background: "color-mix(in srgb, var(--ds-color-primary-600) 10%, transparent)",
                color: "var(--ds-color-primary-600)"
              }}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>smartphone</span>
              MS Digital
            </Link>
          </div>
        </div>

        {/* Domínios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full relative z-10">
          {dominiosFiltrados.map(dominio => (
            <div key={dominio.id} className="flex flex-col">
              <h2
                className="text-lg font-bold mb-5 pb-2 border-b uppercase tracking-wider h-16 flex items-end"
                style={{
                  color: "var(--ds-color-text-primary)",
                  fontFamily: "var(--ds-font-family-heading)",
                  borderColor: "var(--ds-color-border)"
                }}
              >
                <span className="w-full leading-tight">{dominio.nome}</span>
              </h2>
              <div className="flex flex-col gap-4">
                {dominio.paineis.map(painel => (
                  <LinkItem key={painel.rota} painel={painel} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {nenhumResultado && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-icons mb-4" style={{ fontSize: 48, color: "var(--ds-color-border)" }}>
              search_off
            </span>
            <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--ds-color-text-primary)" }}>Nenhum painel encontrado</h3>
            <p style={{ color: "var(--ds-color-text-secondary)" }}>
              Não encontramos resultados para "{busca}". Tente usar outros termos.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function LinkItem({ painel }: { painel: Painel }) {
  return (
    <Link
      href={painel.rota}
      className="group flex items-center p-4 transition-all duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        background: "var(--ds-color-background)",
        borderRadius: "var(--ds-radius-md)",
        border: "1px solid var(--ds-color-border)",
        boxShadow: "var(--ds-shadow-card-sm)",
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 mr-4 transition-colors"
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--ds-radius-sm)",
          background: `color-mix(in srgb, ${painel.cor} 10%, transparent)`,
          color: painel.cor,
        }}
      >
        <span className="material-icons" style={{ fontSize: 24 }}>
          {painel.icone}
        </span>
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <h4 style={{ color: "var(--ds-color-text-primary)" }} className="text-base font-semibold truncate group-hover:underline">
          {painel.nome}
        </h4>
        <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm truncate">
          {painel.descricao}
        </p>
      </div>
      <span
        className="material-icons opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1"
        style={{ color: painel.cor, fontSize: 20 }}
      >
        arrow_forward
      </span>
    </Link>
  );
}

function DecoracaoFundo() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 400"
      className="pointer-events-none absolute right-0 top-0 -z-0 hidden lg:block"
      style={{ width: 600, height: 400, opacity: 0.15, transform: "translate(20%, -10%)" }}
    >
      <g stroke="var(--ds-color-border)" strokeWidth="1.5" fill="none">
        <line x1="80" y1="90" x2="230" y2="60" />
        <line x1="230" y1="60" x2="380" y2="130" />
        <line x1="230" y1="60" x2="200" y2="210" />
        <line x1="380" y1="130" x2="520" y2="90" />
        <line x1="380" y1="130" x2="440" y2="280" />
        <line x1="200" y1="210" x2="90" y2="270" />
        <line x1="200" y1="210" x2="340" y2="300" />
        <line x1="340" y1="300" x2="440" y2="280" />
      </g>
      <circle cx="80" cy="90" r="7" fill="var(--ds-color-primary-600)" />
      <circle cx="230" cy="60" r="10" fill="var(--ds-color-primary-600)" />
      <circle cx="380" cy="130" r="8" fill="var(--ds-color-secondary-600)" />
      <circle cx="520" cy="90" r="6" fill="var(--ds-color-secondary-600)" />
      <circle cx="200" cy="210" r="9" fill="var(--ds-color-tertiary-600)" />
      <circle cx="90" cy="270" r="6" fill="var(--ds-color-primary-600)" />
      <circle cx="340" cy="300" r="7" fill="var(--ds-color-secondary-600)" />
      <circle cx="440" cy="280" r="8" fill="var(--ds-color-tertiary-600)" />
    </svg>
  );
}
