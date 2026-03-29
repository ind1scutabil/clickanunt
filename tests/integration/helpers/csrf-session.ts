/**
 * CSRF + cookie header pentru fetch din Node (teste de integrare).
 */
export type CsrfSession = {
  csrfToken: string;
  cookieHeader: string;
  origin: string;
};

export async function createCsrfSession(baseUrl: string): Promise<CsrfSession> {
  const origin = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${origin}/api/csrf`, {
    headers: { Origin: origin },
  });
  if (!res.ok) {
    throw new Error(`CSRF init failed: ${res.status}`);
  }
  const data = (await res.json()) as { csrfToken?: string };
  if (!data.csrfToken) {
    throw new Error("CSRF response missing csrfToken");
  }

  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  let cookieParts: string[] = [];
  if (typeof headers.getSetCookie === "function") {
    cookieParts = headers.getSetCookie().map((c) => c.split(";")[0]);
  } else {
    const sc = res.headers.get("set-cookie");
    if (sc) {
      cookieParts = sc.split(/,(?=[^;]+?=)/).map((c) => c.trim().split(";")[0]);
    }
  }

  return {
    csrfToken: data.csrfToken,
    cookieHeader: cookieParts.join("; "),
    origin,
  };
}
