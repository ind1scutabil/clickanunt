/**
 * Production error capture — persists to system_error_logs; optional Sentry forward.
 */

import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function captureError(
  source: string,
  message: string,
  err?: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    console.error("[captureError]", source, message, err, context);
    return;
  }

  const stack =
    err instanceof Error
      ? err.stack?.slice(0, 8000)
      : typeof err === "string"
        ? err.slice(0, 2000)
        : undefined;

  try {
    await prisma.systemErrorLog.create({
      data: {
        id: randomUUID(),
        source: source.slice(0, 120),
        message: message.slice(0, 4000),
        stack: stack ?? undefined,
        context: context ? (context as object) : undefined,
      },
    });
  } catch (e) {
    console.error("[captureError] failed to persist", e);
  }

  if (process.env.SENTRY_DSN && typeof process.env.SENTRY_DSN === "string") {
    console.error("[captureError] Sentry DSN set — wire @sentry/nextjs for production forwarding");
  }
}
