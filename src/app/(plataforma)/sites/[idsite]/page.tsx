import { notFound } from "next/navigation";
import { getMatomoSites } from "@/lib/data";
import { SiteDetailClient } from "./SiteDetailClient";

export default async function SiteDetalhePage({ params }: { params: Promise<{ idsite: string }> }) {
  const { idsite } = await params;
  const site = getMatomoSites().find((s) => String(s.idsite) === idsite);
  if (!site) notFound();

  return <SiteDetailClient site={site} />;
}
