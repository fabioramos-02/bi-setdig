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

/** Proxy Next 16 (antigo middleware). Faz 2 coisas:
 *  1. Basic Auth via env BI_AUTH_USER/BI_AUTH_PASSWORD. Sem envs = passa
 *     (dev local não pede senha).
 *  2. Serve markdown na raiz quando Accept: text/markdown (integração
 *     search/AI). */
export function proxy(request: NextRequest) {
  const authResp = checkAuth(request);
  if (authResp) return authResp;

  if (
    request.method === "GET" &&
    request.nextUrl.pathname === "/" &&
    (request.headers.get("accept") ?? "").includes("text/markdown")
  ) {
    return new NextResponse(HOME_MARKDOWN, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
  return NextResponse.next();
}

function checkAuth(req: NextRequest): NextResponse | null {
  const user = process.env.BI_AUTH_USER;
  const password = process.env.BI_AUTH_PASSWORD;
  if (!user || !password) return null;

  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    const sep = decoded.indexOf(":");
    if (sep > 0 && decoded.slice(0, sep) === user && decoded.slice(sep + 1) === password) {
      return null;
    }
  }
  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BI SETDIG"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt).*)"],
};
