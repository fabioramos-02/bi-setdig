import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ds/ThemeToggle";

export const metadata: Metadata = {
  title: "Dados Centralizados - SETDIG",
};

type Painel = {
  nome: string;
  rota: string;
  icone: string;
  descricao: string;
  cor: string;
};

// Fora do grupo (plataforma) de propósito — a Home não tem Sidebar (é a porta
// de entrada, não um painel). As 6 rotas batem com components/ds/Sidebar.tsx.
const PAINEIS: Painel[] = [
  {
    nome: "Portal Único",
    rota: "/analytics/portal-ms",
    icone: "language",
    descricao: "Acompanha acessos, visitantes e páginas mais usadas do portal único do Governo (ms.gov.br).",
    cor: "var(--ds-color-primary-600)",
  },
  {
    nome: "MS Digital",
    rota: "/analytics/ms-digital",
    icone: "smartphone",
    descricao: "Mostra como as pessoas usam o aplicativo MS Digital: quem usa, o que mais acessam e como navegam.",
    cor: "var(--ds-color-primary-600)",
  },
  {
    nome: "Sites",
    rota: "/sites",
    icone: "public",
    descricao: "Mostra visitas e páginas mais acessadas de qualquer um dos sites do Governo.",
    cor: "var(--ds-color-primary-600)",
  },
  {
    nome: "Serviços",
    rota: "/servicos",
    icone: "assignment_turned_in",
    descricao: "Mostra quantos serviços estão cadastrados no portal e quais os cidadãos mais acessam.",
    cor: "var(--ds-color-primary-600)",
  },
  {
    nome: "Avaliação da Carta",
    rota: "/qualidade",
    icone: "verified",
    descricao: "Reúne indicadores de qualidade e melhoria contínua dos serviços digitais do Estado.",
    cor: "var(--ds-color-primary-600)",
  },
  {
    nome: "Censo Digital",
    rota: "/censo-digital",
    icone: "account_balance",
    descricao: "Reúne indicadores estratégicos para acompanhar a transformação digital do Estado.",
    cor: "var(--ds-color-primary-600)",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ds-color-background)" }}>
      <header
        style={{ background: "var(--ds-color-primary-600)" }}
        className="flex items-center justify-between px-4 sm:px-8 h-[88px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG vendorizado, sem otimização de imagem necessária */}
        <img src="/images/logo-ms-horizontal.svg" alt="Governo de Mato Grosso do Sul" className="h-7 sm:h-8 w-auto" />
        <ThemeToggle />
      </header>

      <section className="relative overflow-hidden px-4 sm:px-8 py-10 sm:py-16">
        <DecoracaoRede />
        <div className="relative max-w-2xl">
          <h1
            style={{ color: "var(--ds-color-primary-600)", fontFamily: "var(--ds-font-family-heading)" }}
            className="text-4xl sm:text-5xl font-bold leading-tight mb-5"
          >
            Dados Centralizados da SETDIG
          </h1>
          <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-base sm:text-lg leading-relaxed">
            Plataforma que reúne indicadores estratégicos, operacionais e de governança do Governo de Mato Grosso do
            Sul em um único ambiente.
          </p>
        </div>
      </section>

      <main className="flex-1 px-4 sm:px-8 pb-10 sm:pb-16">
        <h2
          style={{ color: "var(--ds-color-text-primary)", fontFamily: "var(--ds-font-family-heading)" }}
          className="text-xl sm:text-2xl font-semibold mb-2"
        >
          Painéis disponíveis
        </h2>
        <p style={{ color: "var(--ds-color-text-muted)" }} className="text-sm mb-8">
          Escolha um painel para ver os indicadores.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {PAINEIS.map((p) => (
            <PainelCard key={p.rota} painel={p} />
          ))}
        </div>
      </main>
    </div>
  );
}

function PainelCard({ painel }: { painel: Painel }) {
  return (
    <Link
      href={painel.rota}
      className="group flex flex-col p-6 transition-all duration-200 hover:-translate-y-1"
      style={{
        background: "var(--ds-color-background)",
        borderRadius: "var(--ds-radius-lg)",
        borderLeft: `4px solid ${painel.cor}`,
        boxShadow: "var(--ds-shadow-card-sm)",
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 mb-4 transition-colors"
        aria-hidden
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--ds-radius-md)",
          background: `color-mix(in srgb, ${painel.cor} 12%, transparent)`,
          color: painel.cor,
        }}
      >
        <span className="material-icons" style={{ fontSize: 28, lineHeight: 1 }}>
          {painel.icone}
        </span>
      </div>

      <h3 style={{ color: "var(--ds-color-text-primary)" }} className="text-lg font-semibold mb-2">
        {painel.nome}
      </h3>
      <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm leading-relaxed flex-1 mb-4">
        {painel.descricao}
      </p>

      <span
        className="inline-flex items-center gap-1 text-sm font-semibold transition-transform group-hover:translate-x-1"
        style={{ color: painel.cor }}
      >
        Acessar painel
        <span className="material-icons" aria-hidden style={{ fontSize: 18 }}>
          arrow_forward
        </span>
      </span>
    </Link>
  );
}

/** Decoração puramente visual (rede de pontos, alude a "dados conectados")
 * — SVG inline, sem asset novo, opacidade baixa pra não competir com o
 * texto. `aria-hidden`: some pra leitor de tela. */
function DecoracaoRede() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 400"
      className="pointer-events-none absolute right-[-60px] top-1/2 -translate-y-1/2 hidden md:block"
      style={{ width: 520, height: 360, opacity: 0.35 }}
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
