import Link from "next/link";
import { ContentTopBar } from "@/components/ds/ContentTopBar";

const DOMINIOS = [
  { nome: "Portal Único", rota: "/analytics/portal-ms" },
  { nome: "MS Digital", rota: "/analytics/ms-digital" },
  { nome: "Serviços", rota: "/servicos" },
  { nome: "Qualidade", rota: "/qualidade" },
  { nome: "Governança", rota: "/governanca" },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Dados centralizados - SETDIG" />
      <main className="flex-1 p-6">
        <p style={{ color: "var(--ds-color-text-secondary)" }} className="mb-6">
          Governo de Mato Grosso do Sul — domínios em migração (ver docs/architecture).
        </p>
        <nav className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMINIOS.map((d) => (
            <Link
              key={d.rota}
              href={d.rota}
              style={{
                border: "1px solid var(--ds-color-border)",
                borderRadius: "var(--ds-radius-md)",
                padding: "var(--ds-spacing-20)",
                color: "var(--ds-color-text-primary)",
              }}
              className="hover:shadow-md transition-shadow"
            >
              {d.nome}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
