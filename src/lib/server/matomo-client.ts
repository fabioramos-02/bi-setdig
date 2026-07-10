/**
 * Cliente Matomo server-only — porta TS de data-platform/extract/matomo.py,
 * usado SÓ pelo Route Handler de "Intervalo de datas" (ADR-010). Sempre
 * period=range — já roda em produção pros mesmos 6 relatórios no dashboard
 * Streamlit irmão (matomo/matomo-analytics-dashboard), sem instabilidade
 * documentada (diferente de Transitions, que já removemos do pipeline).
 *
 * NUNCA importar este arquivo de um Client Component — lê MATOMO_TOKEN.
 */

const MATOMO_URL = process.env.MATOMO_URL ?? "";
const MATOMO_SITE_ID = process.env.MATOMO_SITE_ID ?? "";
const MATOMO_TOKEN = process.env.MATOMO_TOKEN ?? "";

async function call<T = unknown>(method: string, dataInicio: string, dataFim: string, extra?: Record<string, string | number>): Promise<T> {
  const params = new URLSearchParams({
    module: "API",
    method,
    idSite: MATOMO_SITE_ID,
    period: "range",
    date: `${dataInicio},${dataFim}`,
    format: "JSON",
    token_auth: MATOMO_TOKEN,
  });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  }
  const url = `${MATOMO_URL}index.php?${params.toString()}`;

  let ultimoErro: unknown;
  for (const tentativa of [1, 2]) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) {
        const is4xx = response.status >= 400 && response.status < 500;
        if (tentativa === 2 || is4xx) {
          throw new Error(`Matomo ${method} -> HTTP ${response.status}`);
        }
        await new Promise((r) => setTimeout(r, 5_000));
        continue;
      }
      return (await response.json()) as T;
    } catch (exc) {
      ultimoErro = exc;
      if (tentativa === 2) throw exc;
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  throw ultimoErro;
}

type MatomoRow = { label?: string; nb_visits?: number; url?: string };

export function getCity(inicio: string, fim: string, limit = 200) {
  return call<MatomoRow[]>("UserCountry.getCity", inicio, fim, { filter_limit: limit });
}

export function getVisitTime(inicio: string, fim: string) {
  return call<MatomoRow[]>("VisitTime.getVisitInformationPerServerTime", inicio, fim);
}

export function getBrowsers(inicio: string, fim: string, limit = 20) {
  return call<MatomoRow[]>("DevicesDetection.getBrowsers", inicio, fim, { filter_limit: limit });
}

export function getDeviceType(inicio: string, fim: string) {
  return call<MatomoRow[]>("DevicesDetection.getType", inicio, fim);
}

export function getPageUrls(inicio: string, fim: string, limit = 500) {
  return call<MatomoRow[]>("Actions.getPageUrls", inicio, fim, { filter_limit: limit, flat: 1, expanded: 0 });
}

export function getSiteSearchKeywords(inicio: string, fim: string, limit = 50) {
  return call<MatomoRow[]>("Actions.getSiteSearchKeywords", inicio, fim, { filter_limit: limit });
}

export function getEntryPages(inicio: string, fim: string, limit = 20) {
  return call<MatomoRow[]>("Actions.getEntryPageUrls", inicio, fim, { filter_limit: limit, flat: 1 });
}

export function getOutlinks(inicio: string, fim: string, limit = 50) {
  return call<MatomoRow[]>("Actions.getOutlinks", inicio, fim, { filter_limit: limit });
}
