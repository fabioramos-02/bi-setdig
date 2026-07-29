import { NextResponse, type NextRequest } from "next/server";

const HOME_MARKDOWN = `# Portal de BI — SETDIG

Painel público de analytics do Governo de Mato Grosso do Sul, mantido pela
Secretaria-Executiva de Transformação Digital (SETDIG/SEGOV). Reúne
indicadores de canais digitais, qualidade dos serviços ao cidadão e
governança da transformação digital estadual.

## Painéis disponíveis

### Canais Digitais

- [Portal Único](/analytics/portal-ms) — acessos e uso do ms.gov.br.
- [MS Digital](/analytics/ms-digital) — uso do aplicativo MS Digital.
- [Sites](/sites) — visitas aos sites de secretarias, fundações e autarquias.

### Serviços e Qualidade

- [Carta de Serviços](/servicos) — catálogo e serviços mais acessados pelo cidadão.
- [Avaliação da Carta](/avaliacao-carta) — erros reportados e satisfação com os serviços.

### Governança Estratégica

- [Levantamento inicial de Serviços Digitais](/censo-digital) — indicadores de transformação digital por órgão.

## Metadados

- **Mantenedor:** Secretaria-Executiva de Transformação Digital — SETDIG (Governo de MS)
- **Índice canônico:** /sitemap.xml
- **Política de uso IA/buscador:** /robots.txt (Content-Signal: search=yes, ai-train=yes, ai-input=yes)
`;

export function proxy(request: NextRequest) {
  if (request.method !== "GET") return NextResponse.next();
  if (request.nextUrl.pathname !== "/") return NextResponse.next();

  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/markdown")) return NextResponse.next();

  return new NextResponse(HOME_MARKDOWN, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const config = {
  matcher: "/",
};
