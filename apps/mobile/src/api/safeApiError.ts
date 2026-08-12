/**
 * Surface server `error` (preferred) / `message` for UI — never dump stacks or tokens.
 * Pure helpers (Jest-safe). No production backdoors / test query params.
 */

/** Statuses useful for parity demos of the HTTP error matrix (unit-test / local mock). */
export const HTTP_ERROR_DEMO_STATUSES = [400, 401, 403, 404, 409, 422, 429, 500] as const;

const NETWORK_FAILURE_RO =
  'Conexiune eșuată. Verifică rețeaua și încearcă din nou.';

/**
 * Romanian-friendly fallback when the server body has no safe user string.
 * Prefer calling via `safeApiErrorMessage` so server `error`/`message` still win when safe.
 */
export function httpStatusFallbackMessage(status: number): string {
  switch (status) {
    case 400:
    case 422:
      return 'Datele trimise nu sunt valide. Verifică formularul.';
    case 401:
      return 'Sesiune expirată sau neautorizată. Autentifică-te din nou.';
    case 403:
      return 'Nu ai acces la această resursă.';
    case 404:
      return 'Resursa nu a fost găsită.';
    case 409:
      return 'Conflict — resursa există deja sau starea s-a schimbat.';
    case 429:
      return 'Prea multe cereri. Încearcă din nou peste puțin timp.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Eroare de server. Încearcă din nou.';
    default:
      if (status >= 500) {
        return 'Eroare de server. Încearcă din nou.';
      }
      return `HTTP ${status}`;
  }
}

function isUnsafeErrorText(firstLine: string): boolean {
  return (
    /Bearer\s+/i.test(firstLine) ||
    /\beyJ[A-Za-z0-9_-]{20,}\./.test(firstLine) ||
    /at\s+\S+\s+\(/i.test(firstLine) ||
    firstLine.length > 280
  );
}

/**
 * Extract a single safe UI line from API JSON, else Romanian status fallback.
 */
export function safeApiErrorMessage(
  payload: { error?: unknown; message?: unknown } | null | undefined,
  status: number
): string {
  const raw = payload?.error ?? payload?.message;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? '';
      if (firstLine && !isUnsafeErrorText(firstLine)) {
        return firstLine;
      }
    }
  }
  return httpStatusFallbackMessage(status);
}

/** Map fetch/abort failures to a stable Romanian string (parity demos / offline). */
export function safeNetworkErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return NETWORK_FAILURE_RO;
  }
  const name = error.name || '';
  const msg = error.message || '';
  if (
    name === 'AbortError' ||
    /aborted/i.test(msg) ||
    /network request failed/i.test(msg) ||
    /failed to fetch/i.test(msg) ||
    /networkerror/i.test(msg) ||
    msg === 'Request failed'
  ) {
    return NETWORK_FAILURE_RO;
  }
  // Already user-facing (e.g. from safeApiErrorMessage) — keep.
  return msg.trim() || NETWORK_FAILURE_RO;
}
