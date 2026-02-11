let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (inflight) return inflight;

  inflight = fetch('/api/csrf', { credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const data = (await res.json()) as { csrfToken?: string };
      if (!data.csrfToken) {
        throw new Error('CSRF token missing in response');
      }
      cachedToken = data.csrfToken;
      return cachedToken;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function withCsrfHeaders(init: RequestInit = {}): Promise<RequestInit> {
  const token = await getCsrfToken();
  const headers = new Headers(init.headers || {});
  headers.set('x-csrf-token', token);
  return { ...init, headers, credentials: 'include' };
}