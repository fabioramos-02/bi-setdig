import type { Metadata } from "next";
import { Inter, Fira_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { PlausibleAnalytics } from "@/components/PlausibleAnalytics";
import "./globals.css";

// Branch visual/directus-tipografia: testa Inter + Fira Mono inspirados no Directus.
// Para reverter, basta trocar por Open_Sans novamente (padrão DS-MS).
const inter = Inter({
  variable: "--ds-font-family-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});
const firaMono = Fira_Mono({
  variable: "--bi-font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Plataforma de Analytics — SETDIG",
  description: "Portal único de BIs do Governo de Mato Grosso do Sul",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${firaMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <PlausibleAnalytics />
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
