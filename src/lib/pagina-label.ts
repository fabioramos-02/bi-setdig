import { PORTAL_BASE_URL } from "@/components/dashboard/ServiceCardGrid";

/**
 * Formata `Pagina.url` (Actions.getPageUrls flat=1 do Matomo) pra rótulo
 * legível + link — 3 formatos reais no dataset: URL absoluta completa
 * (http(s)://ms.gov.br/...), path relativo com sufixo " - Others" (agregado
 * do Matomo sem página real), e "Others" puro (sem path nenhum, sem link).
 */
export function labelPagina(url: string): { label: string; href?: string } {
  if (url === "Others") return { label: "Outras (agregado)" };

  if (/^https?:\/\//.test(url)) {
    const semSufixo = url.replace(/ - Others$/, "");
    const path = semSufixo.replace(/^https?:\/\/(www\.)?ms\.gov\.br/, "");
    return { label: path === "" || path === "/" ? "Página inicial" : path, href: semSufixo };
  }

  const semSufixo = url.replace(/ - Others$/, "");
  if (semSufixo === "/") return { label: "Página inicial", href: PORTAL_BASE_URL };
  return { label: semSufixo, href: `${PORTAL_BASE_URL}${semSufixo}` };
}
