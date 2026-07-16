"use client";

import { useEffect, useRef, useState } from "react";
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
        nome: "Carta de Serviços",
        rota: "/servicos",
        icone: "assignment_turned_in",
        descricao: "Catálogo e serviços mais acessados",
        cor: "var(--ds-color-primary-600)",
        tags: ["serviços", "catálogo", "cidadão", "carta"],
      },
      {
        nome: "Avaliação da Carta",
        rota: "/avaliacao-carta",
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

  const dominiosFiltrados = DOMINIOS.map((d) => ({
    ...d,
    paineis: d.paineis.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        p.descricao.toLowerCase().includes(termo) ||
        p.tags.some((t) => t.includes(termo)),
    ),
  })).filter((d) => d.paineis.length > 0);

  const nenhumResultado = dominiosFiltrados.length === 0;

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col" style={{ background: "var(--ds-color-background)" }}>
      <header
        style={{ background: "var(--ds-color-primary-600)" }}
        className="flex items-center justify-between px-4 sm:px-8 h-[64px] shrink-0 z-10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-ms-horizontal.svg" alt="Governo de Mato Grosso do Sul" className="h-7 w-auto" />
        <ThemeToggle />
      </header>

      <main className="flex-1 md:overflow-hidden relative flex flex-col justify-center px-4 sm:px-8 py-8 md:py-0">
        <FundoAnimado />

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-8 lg:mb-10">
            <span
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
              style={{ color: "var(--ds-color-primary-600)" }}
            >
              Governo de Mato Grosso do Sul · SETDIG
            </span>
            <h1
              className="text-4xl sm:text-6xl font-bold mb-3 tracking-tight leading-none"
              style={{
                fontFamily: "var(--ds-font-family-heading)",
                backgroundImage:
                  "linear-gradient(120deg, var(--ds-color-primary-600), color-mix(in srgb, var(--ds-color-primary-600) 55%, #0d99f7))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Centro de Inteligência
            </h1>
            <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-base sm:text-lg mb-7 max-w-xl">
              Explore os indicadores e painéis de dados da transformação digital do Estado.
            </p>

            <div className="relative w-full max-w-xl">
              <span
                className="material-icons absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300"
                style={{ color: busca ? "var(--ds-color-primary-600)" : "var(--ds-color-text-muted)", fontSize: 24 }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Pesquisar painéis ou indicadores..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-14 pr-5 py-3.5 rounded-2xl outline-none transition-all duration-300 text-base focus:-translate-y-0.5"
                style={{
                  background: "var(--ds-color-background)",
                  color: "var(--ds-color-text-primary)",
                  border: "2px solid var(--ds-color-border)",
                  boxShadow: "var(--ds-shadow-card-md)",
                }}
              />
            </div>
          </div>

          {/* Domínios */}
          {nenhumResultado ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="material-icons mb-3" style={{ fontSize: 44, color: "var(--ds-color-border)" }}>
                search_off
              </span>
              <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--ds-color-text-primary)" }}>
                Nenhum painel encontrado
              </h3>
              <p style={{ color: "var(--ds-color-text-secondary)" }}>
                Não encontramos resultados para &quot;{busca}&quot;. Tente outros termos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full">
              {dominiosFiltrados.map((dominio) => (
                <div key={dominio.id} className="flex flex-col">
                  <h2
                    className="text-sm font-bold mb-4 pb-2 border-b uppercase tracking-wider text-center flex items-end justify-center h-16"
                    style={{
                      color: "var(--ds-color-text-primary)",
                      fontFamily: "var(--ds-font-family-heading)",
                      borderColor: "var(--ds-color-border)",
                    }}
                  >
                    <span className="leading-tight">{dominio.nome}</span>
                  </h2>
                  <div className="flex flex-col gap-3">
                    {dominio.paineis.map((painel) => (
                      <LinkItem key={painel.rota} painel={painel} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LinkItem({ painel }: { painel: Painel }) {
  return (
    <Link
      href={painel.rota}
      title={`${painel.nome}: ${painel.descricao}`}
      className="group flex items-center p-3.5 min-h-[74px] transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        background: "var(--ds-color-background)",
        borderRadius: "var(--ds-radius-md)",
        border: "1px solid var(--ds-color-border)",
        boxShadow: "var(--ds-shadow-card-sm)",
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 mr-3.5 transition-colors"
        style={{
          width: 42,
          height: 42,
          borderRadius: "var(--ds-radius-sm)",
          background: `color-mix(in srgb, ${painel.cor} 10%, transparent)`,
          color: painel.cor,
        }}
      >
        <span className="material-icons" style={{ fontSize: 22 }}>
          {painel.icone}
        </span>
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <h3 style={{ color: "var(--ds-color-text-primary)" }} className="text-base font-semibold group-hover:underline">
          {painel.nome}
        </h3>
        <p style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm truncate">
          {painel.descricao}
        </p>
      </div>
      <span
        className="material-icons opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 shrink-0"
        style={{ color: painel.cor, fontSize: 20 }}
      >
        arrow_forward
      </span>
    </Link>
  );
}

/** Fundo futurista: rede de partículas que flutuam e se conectam por linhas —
 * dá atmosfera de "dados em movimento" sem competir com o conteúdo (opacidade
 * baixa, atrás de tudo). Cor vem do azul institucional do DS (resolvido em
 * runtime pro canvas). Respeita prefers-reduced-motion: desenha um quadro
 * estático. Canvas puro, sem biblioteca. */
function FundoAnimado() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // resolve o azul do DS (var → rgb) via elemento-sonda
    const sonda = document.createElement("span");
    sonda.style.color = "var(--ds-color-primary-600)";
    document.body.appendChild(sonda);
    const rgb = getComputedStyle(sonda).color.match(/\d+/g)?.slice(0, 3).join(",") ?? "0,79,159";
    sonda.remove();

    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let largura = 0;
    let altura = 0;
    const DENSIDADE = 12000; // 1 partícula a cada ~12k px²
    const DIST = 140; // distância máx pra conectar
    type P = { x: number; y: number; vx: number; vy: number };
    let particulas: P[] = [];

    const redimensionar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = canvas.clientWidth;
      altura = canvas.clientHeight;
      canvas.width = largura * dpr;
      canvas.height = altura * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(Math.round((largura * altura) / DENSIDADE), 90);
      particulas = Array.from({ length: n }, () => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }));
    };

    const desenhar = () => {
      ctx.clearRect(0, 0, largura, altura);
      for (const p of particulas) {
        if (!reduzir) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > largura) p.vx *= -1;
          if (p.y < 0 || p.y > altura) p.vy *= -1;
        }
      }
      // linhas entre partículas próximas
      for (let i = 0; i < particulas.length; i++) {
        for (let j = i + 1; j < particulas.length; j++) {
          const a = particulas[i];
          const b = particulas[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < DIST) {
            ctx.strokeStyle = `rgba(${rgb},${(1 - d / DIST) * 0.28})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // nós
      ctx.fillStyle = `rgba(${rgb},0.55)`;
      for (const p of particulas) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = 0;
    const loop = () => {
      desenhar();
      raf = requestAnimationFrame(loop);
    };

    redimensionar();
    if (reduzir) desenhar();
    else loop();
    window.addEventListener("resize", redimensionar);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", redimensionar);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.5 }}
    />
  );
}
