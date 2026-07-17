import { classificarPagina, type ContextoSemantico } from "./pagina-tipo.ts";

// Mesmo valor de components/dashboard/ServiceCardGrid.tsx::PORTAL_BASE_URL —
// duplicado (não importado) porque node --test não faz strip de JSX de
// arquivos .tsx (ver pagina-label.test.ts).
const PORTAL_BASE_URL = "https://www.ms.gov.br";

/**
 * Formata `Pagina.url` (Actions.getPageUrls flat=1 do Matomo) pra rótulo
 * legível + link — 3 formatos reais no dataset: URL absoluta completa
 * (http(s)://ms.gov.br/...), path relativo com sufixo " - Others" (agregado
 * do Matomo sem página real), e "Others" puro (sem path nenhum, sem link).
 *
 * Com `ctx` (portal-ms, onde o inventário de cartas está disponível): delega
 * pro classificador semântico (ADR-012) — nome real da carta/órgão em vez do
 * path cru. Sem `ctx` (demais 143 subdomínios monitorados, sem inventário de
 * serviço próprio): fallback original, path despido do host.
 */
export function labelPagina(url: string, ctx?: ContextoSemantico): { label: string; href?: string } {
  if (url === "Others") return { label: "Outras (agregado)" };

  if (ctx) {
    const c = classificarPagina(url, ctx);
    return { label: c.nome, href: c.href };
  }

  if (/^https?:\/\//.test(url)) {
    const semSufixo = url.replace(/ - Others$/, "");
    const path = semSufixo.replace(/^https?:\/\/(www\.)?ms\.gov\.br/, "");
    return { label: path === "" || path === "/" ? "Página inicial" : path, href: semSufixo };
  }

  const semSufixo = url.replace(/ - Others$/, "");
  if (semSufixo === "/") return { label: "Página inicial", href: PORTAL_BASE_URL };
  return { label: semSufixo, href: `${PORTAL_BASE_URL}${semSufixo}` };
}
