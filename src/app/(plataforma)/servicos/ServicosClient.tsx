"use client";

import { useEffect, useMemo, useState } from "react";
import type { StatusIntervalo } from "@/components/dashboard/AvisoSnapshotAproximado";
import { ContentTopBar } from "@/components/ds/ContentTopBar";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { Tabs, type TabItem } from "@/components/dashboard/Tabs";
import { VisaoGeralTab } from "./VisaoGeralTab";
import { ExplorarTab } from "./ExplorarTab";
import { OrgaosSetoresTab } from "./OrgaosSetoresTab";
import { NovosServicosTab } from "./NovosServicosTab";
import { usePeriodo } from "@/lib/periodo-context";
import { intervaloDoBucket } from "@/lib/period-filter";
import type { InventarioResumo, InventarioOrgao, CartaRelacao } from "@/lib/data";

const ROTULO_PERIODO = { dia: "no dia", semana: "na semana", mes: "no mês", ano: "no ano", intervalo: "no intervalo" };

export type RankVisita = { rotulo: string; visitas: number };
export type CartaVisita = { titulo: string; orgaoSigla: string; setor: string | null; categoria: string; slug: string; visitas: number; url: string };
// Shape devolvido por /api/analytics/servicos — visitas SEMPRE ao vivo (não há
// snapshot estático de demanda; só o inventário é estático).
export type LiveServicos = {
  porCarta: CartaVisita[];
  porOrgao: RankVisita[];
  porCategoria: RankVisita[];
  porSetor: RankVisita[];
  top5: string[];
  evolucao: Record<string, number | string>[];
};

export function ServicosClient({
  resumo,
  orgaos,
  relacao,
}: {
  resumo: InventarioResumo;
  orgaos: InventarioOrgao[];
  relacao: CartaRelacao[];
}) {
  const { estado, min, max } = usePeriodo();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");
  const range = intervaloDoBucket(estado, min, max);

  // /servicos não tem snapshot de visitas — busca ao vivo sempre (inclusive no
  // período corrente). Só o inventário (resumo/relacao/orgaos) é estático.
  const [live, setLive] = useState<LiveServicos | null>(null);
  const [liveRange, setLiveRange] = useState<{ inicio: string; fim: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "erro">("idle");

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/analytics/servicos?inicio=${range.inicio}&fim=${range.fim}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LiveServicos>;
      })
      .then((data) => {
        if (cancelado) return;
        setLive(data);
        setLiveRange({ inicio: range.inicio, fim: range.fim });
        setLiveStatus("idle");
      })
      .catch(() => {
        if (cancelado) return;
        setLiveStatus("erro");
      });
    return () => {
      cancelado = true;
    };
  }, [range.inicio, range.fim]);

  const valido = live !== null && liveRange?.inicio === range.inicio && liveRange?.fim === range.fim;
  const status: StatusIntervalo = valido ? "ok" : liveStatus === "erro" ? "fallback" : "carregando";
  const rotuloPeriodo = ROTULO_PERIODO[estado.tipo];

  const visitasPorSlug = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of live?.porCarta ?? []) m.set(c.slug, c.visitas);
    return m;
  }, [live]);

  const cartasAtivas = useMemo(() => relacao.filter((c) => c.ativo), [relacao]);

  const abas: TabItem[] = [
    {
      id: "visao-geral",
      label: "1. Visão Geral",
      content: <VisaoGeralTab resumo={resumo} cartas={cartasAtivas} live={valido ? live : null} status={status} rotuloPeriodo={rotuloPeriodo} />,
    },
    {
      id: "explorar",
      label: "2. Explorar Cartas",
      content: <ExplorarTab cartas={cartasAtivas} visitasPorSlug={visitasPorSlug} status={status} rotuloPeriodo={rotuloPeriodo} />,
    },
    {
      id: "orgaos",
      label: "3. Órgãos e Setores",
      content: (
        <OrgaosSetoresTab
          live={valido ? live : null}
          orgaos={orgaos}
          cartas={cartasAtivas}
          status={status}
          rotuloPeriodo={rotuloPeriodo}
        />
      ),
    },
    {
      id: "novos",
      label: "4. Novos Serviços",
      content: <NovosServicosTab cartas={cartasAtivas} />,
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <ContentTopBar title="Carta de Serviços">
        <ExportPdfButton />
      </ContentTopBar>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs items={abas} ativa={abaAtiva} onAtivaChange={setAbaAtiva} />
      </main>
    </div>
  );
}
