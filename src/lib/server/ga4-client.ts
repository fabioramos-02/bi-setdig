/**
 * Cliente GA4 server-only — porta TS de data-platform/extract/ga4.py, via
 * REST (GA4 Data API) em vez do SDK gRPC Python, pra não somar dependência
 * pesada só pro Route Handler de "Intervalo de datas" (ADR-010). Mesmo
 * fluxo OAuth2 (refresh token renova sozinho, sem interação humana).
 *
 * NUNCA importar este arquivo de um Client Component — lê GOOGLE_CLIENT_SECRET.
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? "";
const GOOGLE_PROPERTY_ID = process.env.GOOGLE_PROPERTY_ID ?? "";

async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: GOOGLE_REFRESH_TOKEN,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`GA4 OAuth refresh falhou -> HTTP ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

type Ga4Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Ga4Response = { rows?: Ga4Row[] };

async function runReport(
  dimension: string,
  metrics: string[],
  startDate: string,
  endDate: string,
  limit?: number,
): Promise<Ga4Row[]> {
  const token = await accessToken();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GOOGLE_PROPERTY_ID}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dimensions: [{ name: dimension }],
      metrics: metrics.map((name) => ({ name })),
      dateRanges: [{ startDate, endDate }],
      ...(limit ? { limit } : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GA4 runReport(${dimension}) -> HTTP ${res.status}`);
  const data = (await res.json()) as Ga4Response;
  return data.rows ?? [];
}

export type GA4Overview = { newVsReturning: string; activeUsers: number; sessions: number; screenPageViews: number };

export async function getOverview(inicio: string, fim: string): Promise<GA4Overview[]> {
  const rows = await runReport("newVsReturning", ["activeUsers", "sessions", "screenPageViews"], inicio, fim);
  return rows.map((r) => ({
    newVsReturning: r.dimensionValues?.[0]?.value ?? "",
    activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
    sessions: Number(r.metricValues?.[1]?.value ?? 0),
    screenPageViews: Number(r.metricValues?.[2]?.value ?? 0),
  }));
}

export type Plataforma = { operatingSystem: string; activeUsers: number };

export async function getPlatform(inicio: string, fim: string): Promise<Plataforma[]> {
  const rows = await runReport("operatingSystem", ["activeUsers"], inicio, fim);
  return rows
    .map((r) => ({ operatingSystem: r.dimensionValues?.[0]?.value ?? "", activeUsers: Number(r.metricValues?.[0]?.value ?? 0) }))
    .filter((r) => r.operatingSystem !== "(not set)");
}

const SCREEN_DIM_CANDIDATES = ["unifiedScreenName", "customEvent:unified_screen_name", "screenPageTitle", "screenName", "pageTitle"];
const EXCLUIR_TELA = new Set(["(not set)", "", "(other)"]);

export type Servico = { servico: string; acessos: number };

export async function getServices(inicio: string, fim: string, limit = 15): Promise<Servico[]> {
  let rows: Servico[] = [];
  for (const dim of SCREEN_DIM_CANDIDATES) {
    try {
      const raw = await runReport(dim, ["screenPageViews"], inicio, fim, 100);
      const candidatas = raw.map((r) => ({ servico: r.dimensionValues?.[0]?.value ?? "", acessos: Number(r.metricValues?.[0]?.value ?? 0) }));
      if (candidatas.some((r) => !EXCLUIR_TELA.has(r.servico) && r.acessos > 0)) {
        rows = candidatas;
        break;
      }
    } catch {
      continue;
    }
  }
  return rows
    .filter((r) => !EXCLUIR_TELA.has(r.servico))
    .sort((a, b) => b.acessos - a.acessos)
    .slice(0, limit);
}

const ORDEM_FUNIL = ["first_open", "session_start", "screen_view", "user_engagement"];

export type EventoFunil = { evento: string; usuarios: number };

export async function getFunnel(inicio: string, fim: string): Promise<EventoFunil[]> {
  const rows = await runReport("eventName", ["totalUsers"], inicio, fim, 100);
  const porEvento = new Map<string, number>();
  for (const r of rows) porEvento.set(r.dimensionValues?.[0]?.value ?? "", Number(r.metricValues?.[0]?.value ?? 0));
  return ORDEM_FUNIL.filter((e) => porEvento.has(e)).map((evento) => ({ evento, usuarios: porEvento.get(evento) ?? 0 }));
}

export type HorarioGa4 = { hora: string; sessoes: number };

export async function getVisitTime(inicio: string, fim: string): Promise<HorarioGa4[]> {
  const rows = await runReport("hour", ["sessions"], inicio, fim);
  return rows
    .map((r) => ({ hora: r.dimensionValues?.[0]?.value ?? "", sessoes: Number(r.metricValues?.[0]?.value ?? 0) }))
    .filter((r) => /^\d+$/.test(r.hora))
    .sort((a, b) => Number(a.hora) - Number(b.hora));
}
