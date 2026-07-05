import Link from "next/link";

/**
 * Logo horizontal (branca) do Governo de MS — vendorizada de
 * noticias.ms.gov.br. Precisa de fundo escuro/colorido pra aparecer
 * (fill #FEFEFE), por isso o wrapper usa --ds-color-primary-600.
 */
export function SidebarLogo() {
  return (
    <Link
      href="/"
      aria-label="Plataforma de Analytics — SETDIG"
      style={{ background: "var(--ds-color-primary-600)" }}
      className="flex items-center justify-center px-4 py-5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG vendorizado, sem otimização de imagem necessária */}
      <img src="/images/logo-ms-horizontal.svg" alt="Governo de Mato Grosso do Sul" className="w-full max-w-[180px]" />
    </Link>
  );
}
