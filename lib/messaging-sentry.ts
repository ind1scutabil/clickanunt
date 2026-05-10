/**
 * Sentry pentru rute/componente messaging (server-side).
 * Activ doar dacă SENTRY_DSN e setat; fără DSN operațiune no-op.
 */

let sentryInitDone = false;

async function ensureSentry(): Promise<typeof import("@sentry/node") | null> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return null;
  try {
    const Sentry = await import("@sentry/node");
    if (!sentryInitDone) {
      Sentry.init({
        dsn,
        tracesSampleRate: Math.min(
          1,
          Math.max(
            0,
            Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.05")
          )
        ),
        environment: process.env.NODE_ENV ?? "development",
      });
      sentryInitDone = true;
    }
    return Sentry;
  } catch {
    return null;
  }
}

export async function messagingSentryCaptureException(
  error: unknown,
  context: Record<string, unknown>,
  fingerprint?: string[]
): Promise<void> {
  const Sentry = await ensureSentry();
  if (!Sentry) return;
  try {
    const err =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : "messaging_error");
    const level = "error" as const;
    Sentry.captureException(err, {
      level,
      tags: { area: "messaging" },
      extra: context,
      ...(fingerprint?.length ? { fingerprint } : {}),
    });
  } catch {
    /* no-op */
  }
}

/** Semnal fără excepție (ex.: reconnect storm pattern). */
export async function messagingSentryCaptureMessage(
  msg: string,
  level: "warning" | "error" | "info" = "warning",
  context?: Record<string, unknown>
): Promise<void> {
  const Sentry = await ensureSentry();
  if (!Sentry) return;
  try {
    const sev =
      level === "error" ? ("error" as const) : level === "info" ? ("info" as const) : ("warning" as const);
    Sentry.captureMessage(msg, { level: sev, extra: context ?? {} });
  } catch {
    /* no-op */
  }
}
