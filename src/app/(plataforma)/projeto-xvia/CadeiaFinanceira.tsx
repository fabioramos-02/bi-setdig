import { cadeiaFinanceira } from "@/lib/tfs";
import { Sigla, ValorStatus } from "./comum";

type Cadeia = ReturnType<typeof cadeiaFinanceira>;

/** As 8 etapas da execução financeira, na ordem em que acontecem. Cada uma com a própria
 * fonte e situação: nenhuma é deduzida da anterior (prompt do painel, item 5). */
export const ETAPAS: { chave: keyof Omit<Cadeia, "recorte">; rotulo: React.ReactNode; texto: string; ust?: boolean }[] = [
  { chave: "ustPrevista", rotulo: <>UST previstas nas <Sigla s="OS">Ordens de Serviço</Sigla></>, texto: "Quantidade pedida formalmente à X-VIA", ust: true },
  { chave: "ustExecutada", rotulo: <><Sigla s="UST" /> executadas</>, texto: "Tarefas da X-VIA concluídas no TFS", ust: true },
  { chave: "ustAceita", rotulo: <>UST aceitas</>, texto: "Aprovadas pela fiscalização", ust: true },
  { chave: "valorConsumido", rotulo: <>Valor consumido</>, texto: "UST executadas × R$ 154,61" },
  { chave: "valorFaturado", rotulo: <>Valor faturado</>, texto: "Notas fiscais apresentadas pela X-VIA" },
  { chave: "valorPago", rotulo: <>Valor pago</>, texto: "Pago pelo Estado" },
  { chave: "valorPendente", rotulo: <>Pendente de pagamento</>, texto: "Faturado e ainda não pago" },
  { chave: "valorGlosado", rotulo: <>Glosado</>, texto: "Descontado por item não aceito" },
];

export function TabelaCadeia({ cadeia }: { cadeia: Cadeia }) {
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--ds-color-text-secondary)" }}>
            <th className="text-left font-medium py-1">Etapa</th>
            <th className="text-left font-medium py-1 hidden sm:table-cell">O que é</th>
            <th className="text-right font-medium py-1">Valor</th>
          </tr>
        </thead>
        <tbody>
          {ETAPAS.map((e) => (
            <tr key={e.chave} style={{ borderTop: "1px solid var(--ds-color-border)" }}>
              <td className="py-2 pr-2">{e.rotulo}</td>
              <td className="py-2 pr-2 hidden sm:table-cell" style={{ color: "var(--ds-color-text-muted)" }}>{e.texto}</td>
              <td className="py-2 text-right"><ValorStatus v={cadeia[e.chave]} ust={e.ust} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {cadeia.recorte.divergencias.length > 0 && (
        <ul className="mt-3 text-xs flex flex-col gap-1" style={{ color: "var(--ds-color-danger)" }}>
          {cadeia.recorte.divergencias.map((d) => <li key={d}>Divergência: {d}</li>)}
        </ul>
      )}
    </div>
  );
}
