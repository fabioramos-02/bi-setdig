import { RankingBarChart } from "@/components/charts/RankingBarChart";
import { ChartLoading } from "@/components/dashboard/ChartLoading";
import type { StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";

export type ItemComNome = { nome: string; valor: number; href?: string };

/**
 * Ranking Top-N + "Ver todas" (`<details>`) — cauda longa fica disponível,
 * não escondida de vez, mas não compete visualmente com o que importa
 * (AGENTS.md "BI de gestão": nunca truncar sem avisar). Padrão usado em
 * mais de uma aba (Busca, Páginas, Fluxo de Navegação) — extraído aqui pra
 * não reimplementar o mesmo par gráfico+expansível 3x.
 */
export function RankingComExpansao({
  titulo,
  itens,
  topN = 5,
  cor,
  status,
  vazio,
  rotuloItem = "itens",
}: {
  titulo: string;
  itens: ItemComNome[];
  topN?: number;
  cor?: string;
  status: StatusIntervalo;
  vazio: string;
  /** Substantivo pro rótulo "Ver todos os N ___" (ex. "páginas", "termos"). */
  rotuloItem?: string;
}) {
  if (itens.length === 0) {
    return (
      <div>
        <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-2">
          {titulo}
        </h3>
        <p className="text-sm" style={{ color: "var(--ds-color-text-muted)" }}>
          {vazio}
        </p>
      </div>
    );
  }

  const top = itens.slice(0, topN);
  const restante = itens.slice(topN);

  return (
    <div>
      <h3 style={{ color: "var(--ds-color-text-secondary)" }} className="text-sm font-semibold mb-3">
        {titulo}
      </h3>
      <ChartLoading status={status} height={180}>
        <RankingBarChart cor={cor} itens={top.map((p) => ({ label: p.nome, valor: p.valor, href: p.href }))} />
      </ChartLoading>

      {restante.length > 0 && (
        <details className="mt-3 print-expandir">
          <summary className="text-sm cursor-pointer" style={{ color: "var(--ds-color-text-secondary)" }}>
            Ver todos os {itens.length} {rotuloItem}
          </summary>
          <ul className="text-sm mt-2 space-y-1">
            {restante.map((p) => (
              <li key={p.nome} className="flex justify-between border-t py-1" style={{ borderColor: "var(--ds-color-border)" }}>
                {p.href ? (
                  <a href={p.href} target="_blank" rel="noopener noreferrer" className="hover:underline" title={p.href}>
                    {p.nome}
                  </a>
                ) : (
                  <span>{p.nome}</span>
                )}
                <span style={{ color: "var(--ds-color-text-muted)" }}>{p.valor.toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
