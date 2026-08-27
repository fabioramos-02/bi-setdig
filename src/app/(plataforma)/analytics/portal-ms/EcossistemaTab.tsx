"use client";

import { useMemo, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DataTable, type Coluna } from "@/components/dashboard/DataTable";
import type {
  PortalUnicoAplicacaoRelacao,
  AmbienteAplicacao,
  SistemaComAssinador,
  FormularioFormFlow,
} from "@/lib/data";

const ROTULO_AMBIENTE: Record<AmbienteAplicacao, string> = {
  prod: "Produção",
  hom: "Homologação",
  dev: "Desenvolvimento",
};
const COR_AMBIENTE: Record<AmbienteAplicacao, string> = {
  prod: "var(--ds-color-success)",
  hom: "var(--ds-color-warning)",
  dev: "var(--ds-color-text-muted)",
};

/** Aba operacional do ecossistema digital do Portal Único — catálogos
 *  completos que antes moravam na Visão Geral. Visão Geral virou macro
 *  (só KPIs); detalhes navegáveis vivem aqui. */
export function EcossistemaTab({
  sistemas,
  contagemAmbientes,
  sistemasAssinador,
  formularios,
}: {
  sistemas: PortalUnicoAplicacaoRelacao[];
  contagemAmbientes: Record<AmbienteAplicacao, number>;
  sistemasAssinador: SistemaComAssinador[];
  formularios: FormularioFormFlow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {sistemas.length > 0 && (
        <SistemasGovBrSection sistemas={sistemas} contagem={contagemAmbientes} />
      )}
      {sistemasAssinador.length > 0 && <SistemasAssinadorSection sistemas={sistemasAssinador} />}
      {formularios.length > 0 && <FormulariosFormFlowSection formularios={formularios} />}
    </div>
  );
}

function SistemasGovBrSection({
  sistemas,
  contagem,
}: {
  sistemas: PortalUnicoAplicacaoRelacao[];
  contagem: Record<AmbienteAplicacao, number>;
}) {
  const [ambienteFiltro, setAmbienteFiltro] = useState<AmbienteAplicacao | "">("");
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return sistemas.filter((s) => {
      if (ambienteFiltro && s.ambiente !== ambienteFiltro) return false;
      if (termo && !s.titulo.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [sistemas, ambienteFiltro, busca]);
  const colunas: Coluna<PortalUnicoAplicacaoRelacao>[] = [
    {
      key: "titulo",
      label: "Sistema",
      sortable: true,
      sortValue: (a) => a.titulo,
      render: (a) => <span style={{ color: "var(--ds-color-text-primary)" }}>{a.titulo}</span>,
    },
    {
      key: "ambiente",
      label: "Ambiente",
      sortable: true,
      sortValue: (a) => a.ambiente,
      render: (a) => (
        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
          style={{ background: "var(--ds-color-background-muted)", color: COR_AMBIENTE[a.ambiente] }}
        >
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: COR_AMBIENTE[a.ambiente] }} />
          {ROTULO_AMBIENTE[a.ambiente]}
        </span>
      ),
    },
  ];
  return (
    <DashboardSection title="Sistemas integrados ao Gov.BR">
      <p className="text-sm mb-3" style={{ color: "var(--ds-color-text-secondary)" }}>
        {sistemas.length} sistemas usam o login único do Portal Único — {contagem.prod} em produção,{" "}
        {contagem.hom} em homologação, {contagem.dev} em desenvolvimento.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="filtro-ambiente" className="text-sm font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
          Ambiente:
        </label>
        <select
          id="filtro-ambiente"
          value={ambienteFiltro}
          onChange={(e) => setAmbienteFiltro(e.target.value as AmbienteAplicacao | "")}
          className="text-sm rounded"
          style={{
            padding: "var(--ds-spacing-8) var(--ds-spacing-12)",
            border: "1px solid var(--ds-color-border)",
            background: "var(--ds-color-background)",
            color: "var(--ds-color-text-primary)",
          }}
        >
          <option value="">Todos ({sistemas.length})</option>
          <option value="prod">Produção ({contagem.prod})</option>
          <option value="hom">Homologação ({contagem.hom})</option>
          <option value="dev">Desenvolvimento ({contagem.dev})</option>
        </select>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="buscar sistema…"
          className="text-sm rounded"
          style={{
            padding: "var(--ds-spacing-8) var(--ds-spacing-12)",
            border: "1px solid var(--ds-color-border)",
            background: "var(--ds-color-background)",
            color: "var(--ds-color-text-primary)",
            minWidth: 200,
            flex: "1 1 200px",
          }}
        />
        {(ambienteFiltro || busca.trim()) && (
          <button
            type="button"
            onClick={() => {
              setAmbienteFiltro("");
              setBusca("");
            }}
            className="text-sm underline"
            style={{ color: "var(--ds-color-primary-600)", background: "transparent", border: 0, cursor: "pointer" }}
          >
            limpar
          </button>
        )}
      </div>
      <DataTable columns={colunas} rows={filtrados} rowKey={(a) => a.titulo} />
      {filtrados.length === 0 && (
        <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
          Nenhum sistema casa com os filtros.
        </p>
      )}
    </DashboardSection>
  );
}

function SistemasAssinadorSection({ sistemas }: { sistemas: SistemaComAssinador[] }) {
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return sistemas;
    return sistemas.filter(
      (s) => s.nome.toLowerCase().includes(termo) || s.callback.toLowerCase().includes(termo),
    );
  }, [sistemas, busca]);
  const colunas: Coluna<SistemaComAssinador>[] = [
    {
      key: "nome",
      label: "Sistema",
      sortable: true,
      sortValue: (s) => s.nome,
      render: (s) => <span style={{ color: "var(--ds-color-text-primary)" }}>{s.nome}</span>,
    },
    {
      key: "callback",
      label: "URL de retorno",
      sortable: true,
      sortValue: (s) => s.callback,
      render: (s) => (
        <a
          href={s.callback}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline"
          style={{ color: "var(--ds-color-text-secondary)" }}
          title={s.callback}
        >
          {hostDe(s.callback)} ↗
        </a>
      ),
    },
  ];
  return (
    <DashboardSection title="Sistemas com Assinador Gov.BR">
      <p className="text-sm mb-3" style={{ color: "var(--ds-color-text-secondary)" }}>
        {sistemas.length} sistemas habilitados para receber assinatura eletrônica pelo Portal Único.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="busca-assinador" className="text-sm font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
          Buscar sistema:
        </label>
        <input
          id="busca-assinador"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="nome ou domínio…"
          className="text-sm rounded"
          style={{
            padding: "var(--ds-spacing-8) var(--ds-spacing-12)",
            border: "1px solid var(--ds-color-border)",
            background: "var(--ds-color-background)",
            color: "var(--ds-color-text-primary)",
            minWidth: 240,
            flex: "1 1 240px",
          }}
        />
        {busca.trim() && (
          <button
            type="button"
            onClick={() => setBusca("")}
            className="text-sm underline"
            style={{ color: "var(--ds-color-primary-600)", background: "transparent", border: 0, cursor: "pointer" }}
          >
            limpar
          </button>
        )}
      </div>
      <DataTable columns={colunas} rows={filtrados} rowKey={(s) => `${s.appId}`} />
      {busca.trim() && filtrados.length === 0 && (
        <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
          Nenhum sistema casa com “{busca}”.
        </p>
      )}
    </DashboardSection>
  );
}

function FormulariosFormFlowSection({ formularios }: { formularios: FormularioFormFlow[] }) {
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return formularios;
    return formularios.filter((f) => f.titulo.toLowerCase().includes(termo));
  }, [formularios, busca]);
  const colunas: Coluna<FormularioFormFlow>[] = [
    {
      key: "titulo",
      label: "Formulário",
      sortable: true,
      sortValue: (f) => f.titulo,
      render: (f) => <span style={{ color: "var(--ds-color-text-primary)" }}>{f.titulo}</span>,
    },
  ];
  return (
    <DashboardSection title="Formulários digitais (FormFlow)">
      <p className="text-sm mb-3" style={{ color: "var(--ds-color-text-secondary)" }}>
        Catálogo dos {formularios.length} serviços com formulário publicado no FormFlow.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="busca-formflow" className="text-sm font-semibold" style={{ color: "var(--ds-color-text-primary)" }}>
          Buscar formulário:
        </label>
        <input
          id="busca-formflow"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="digite parte do título…"
          className="text-sm rounded"
          style={{
            padding: "var(--ds-spacing-8) var(--ds-spacing-12)",
            border: "1px solid var(--ds-color-border)",
            background: "var(--ds-color-background)",
            color: "var(--ds-color-text-primary)",
            minWidth: 240,
            flex: "1 1 240px",
          }}
        />
        {busca.trim() && (
          <button
            type="button"
            onClick={() => setBusca("")}
            className="text-sm underline"
            style={{ color: "var(--ds-color-primary-600)", background: "transparent", border: 0, cursor: "pointer" }}
          >
            limpar
          </button>
        )}
      </div>
      <DataTable columns={colunas} rows={filtrados} rowKey={(f) => f.titulo} />
      {busca.trim() && filtrados.length === 0 && (
        <p className="text-sm mt-2" style={{ color: "var(--ds-color-text-secondary)" }}>
          Nenhum formulário casa com “{busca}”.
        </p>
      )}
    </DashboardSection>
  );
}

function hostDe(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
