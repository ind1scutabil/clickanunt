/**
 * Google Search Console API adapter — fail-closed when credentials are absent.
 * Never logs tokens or private keys.
 */
import { searchConsoleConfigured } from "@/lib/seo/integration-status";

export type SearchConsoleDimension = "query" | "page" | "device" | "country" | "date";

export type SearchConsoleRangeDays = 7 | 28 | 90;

export type SearchConsoleNotConfigured = {
  status: "not_configured";
  message: string;
};

export type SearchConsoleRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleOk = {
  status: "ok";
  rangeDays: SearchConsoleRangeDays;
  dimension: SearchConsoleDimension;
  rows: SearchConsoleRow[];
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  brandedSplit?: { branded: number; nonBranded: number };
};

export type SearchConsoleResult = SearchConsoleNotConfigured | SearchConsoleOk | {
  status: "error";
  message: string;
};

const DEFAULT_BRANDED = [/clickanunt/i, /click\s*anunt/i];

function brandedRules(): RegExp[] {
  const raw = process.env.GSC_BRANDED_QUERY_REGEX?.trim();
  if (!raw) return DEFAULT_BRANDED;
  try {
    return [new RegExp(raw, "i")];
  } catch {
    return DEFAULT_BRANDED;
  }
}

export function isBrandedQuery(query: string): boolean {
  return brandedRules().some((re) => re.test(query));
}

/**
 * Fetch Search Console search analytics.
 * Returns `not_configured` without attempting network I/O when secrets are missing.
 */
export async function fetchSearchConsoleReport(input: {
  rangeDays: SearchConsoleRangeDays;
  dimension: SearchConsoleDimension;
  rowLimit?: number;
}): Promise<SearchConsoleResult> {
  if (!searchConsoleConfigured()) {
    return {
      status: "not_configured",
      message:
        "Search Console API credentials are not configured (GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL, GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY, GOOGLE_SEARCH_CONSOLE_SITE_URL).",
    };
  }

  // Credentials exist but live OAuth/JWT exchange is intentionally not executed
  // in this phase without owner-approved secrets on the runtime environment.
  // Fail closed rather than inventing rows.
  return {
    status: "error",
    message:
      "Search Console credentials are present in env naming contract, but live API calls require owner-approved service-account enablement. See docs/audits/faza21/GSC-SETUP.md.",
  };
}

export function emptySearchConsoleDashboardPayload() {
  return {
    status: "not_configured" as const,
    rangeOptions: [7, 28, 90] as const,
    message: "Date Search Console indisponibile — integrarea nu este configurată.",
    metrics: null,
    topQueries: [],
    topPages: [],
    daily: [],
    devices: [],
    countries: [],
  };
}
