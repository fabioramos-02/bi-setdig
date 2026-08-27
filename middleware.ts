import { NextRequest, NextResponse } from "next/server";

/** Basic Auth pra proteger o BI em produção. 1 usuário/senha via env vars
 *  BI_AUTH_USER / BI_AUTH_PASSWORD. Sem envs → passa direto (dev local
 *  segue funcionando sem prompt). Cobre TODAS as rotas exceto assets
 *  estáticos e o próprio /_next (config abaixo). */
export function middleware(req: NextRequest) {
  const user = process.env.BI_AUTH_USER;
  const password = process.env.BI_AUTH_PASSWORD;
  if (!user || !password) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    const sep = decoded.indexOf(":");
    if (sep > 0 && decoded.slice(0, sep) === user && decoded.slice(sep + 1) === password) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BI SETDIG"' },
  });
}

export const config = {
  // Roda em tudo, exceto assets internos do Next e favicon — ninguém logado
  // não precisa autenticar pra ver JS/CSS chunk.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml).*)"],
};
