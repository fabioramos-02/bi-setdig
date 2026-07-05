"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNavItem({ rota, nome, onClick }: { rota: string; nome: string; onClick?: () => void }) {
  const pathname = usePathname();
  const ativo = pathname === rota;

  return (
    <Link
      href={rota}
      onClick={onClick}
      aria-current={ativo ? "page" : undefined}
      style={{
        color: ativo ? "var(--ds-color-primary-600)" : "var(--ds-color-text-primary)",
        background: ativo ? "var(--ds-color-background-muted)" : "transparent",
        borderLeft: ativo ? "3px solid var(--ds-color-primary-600)" : "3px solid transparent",
      }}
      className="block px-4 py-3 text-sm font-medium hover:bg-[var(--ds-color-background-muted)] transition-colors"
    >
      {nome}
    </Link>
  );
}
