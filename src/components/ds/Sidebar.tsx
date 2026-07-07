"use client";

import { useState } from "react";
import { SidebarLogo } from "@/components/ds/SidebarLogo";
import { SidebarNavItem } from "@/components/ds/SidebarNavItem";
import { SidebarPeriodFilter } from "@/components/dashboard/SidebarPeriodFilter";
import { ThemeToggle } from "@/components/ds/ThemeToggle";

const DOMINIOS = [
  { nome: "Analytics — Portal MS", rota: "/analytics/portal-ms" },
  { nome: "Analytics — MS Digital", rota: "/analytics/ms-digital" },
  { nome: "Serviços", rota: "/servicos" },
  { nome: "Qualidade", rota: "/qualidade" },
  { nome: "Governança", rota: "/governanca" },
];

/**
 * Navegação global — shell de todas as 7 rotas (ver app/(plataforma)/layout.tsx).
 * Drawer com hambúrguer em mobile (não bottom bar — 5 rótulos de texto não
 * cabem sem cortar, drawer preserva legibilidade).
 */
export function Sidebar() {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Abrir menu de navegação"
        style={{ background: "var(--ds-color-primary-600)", color: "var(--ds-color-text-inverse)" }}
        className="md:hidden fixed top-3 left-3 z-50 w-11 h-11 rounded-md flex items-center justify-center print:hidden"
      >
        ☰
      </button>

      {aberta && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden print:hidden"
          onClick={() => setAberta(false)}
          aria-hidden="true"
        />
      )}

      <aside
        style={{ background: "var(--ds-color-background)", borderRight: "1px solid var(--ds-color-border)" }}
        className={`fixed inset-y-0 left-0 w-64 z-40 flex flex-col transition-transform md:translate-x-0 print:hidden ${
          aberta ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarLogo />
        <div className="flex-1 overflow-y-auto">
          <nav className="py-4" aria-label="Domínios">
            {DOMINIOS.map((d) => (
              <SidebarNavItem key={d.rota} {...d} onClick={() => setAberta(false)} />
            ))}
          </nav>
          <SidebarPeriodFilter />
        </div>
        <div style={{ borderTop: "1px solid var(--ds-color-border)" }} className="p-4 flex justify-center">
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
