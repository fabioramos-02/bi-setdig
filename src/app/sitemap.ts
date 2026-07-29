import type { MetadataRoute } from "next";
import { SIGLAS_CENSO } from "@/lib/censo";
import { getMatomoSites } from "@/lib/data";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bi-setdig.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const home = {
    url: `${baseUrl}/`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 1.0,
  };

  const analytics = ["/analytics/portal-ms", "/analytics/ms-digital"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const dominios = ["/avaliacao-carta", "/censo-digital", "/servicos", "/sites"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const censoOrgaos = SIGLAS_CENSO.map((orgao) => ({
    url: `${baseUrl}/censo-digital/${orgao}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const sites = getMatomoSites().map((s) => ({
    url: `${baseUrl}/sites/${s.idsite}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [home, ...analytics, ...dominios, ...censoOrgaos, ...sites];
}
