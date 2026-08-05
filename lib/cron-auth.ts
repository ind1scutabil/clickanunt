import { NextRequest, NextResponse } from "next/server";

/**
 * Fail-closed cron authorization.
 * Accepts Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 * Does not accept secrets in query strings.
 */
export function authorizeCronRequest(request: NextRequest): NextResponse | null {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) {
    return NextResponse.json(
      { error: "CRON_SECRET nu este configurat" },
      { status: 503 }
    );
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const presented = bearer || headerSecret;

  if (!presented || presented !== configured) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  return null;
}
