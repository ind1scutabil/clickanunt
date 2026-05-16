/**
 * Domain-scoped structured logs — no passwords, tokens, base64 payloads, or full card data.
 */

import { logger } from "@/lib/observability";

export type DomainEventKind = "upload" | "payment" | "api";

function safeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (/password|token|secret|authorization|base64|card/i.test(k)) continue;
    if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 120)}…[truncated]`;
      continue;
    }
    out[k] = v;
  }
  return out;
}

export function logDomainEvent(
  kind: DomainEventKind,
  code: string,
  message: string,
  meta: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info"
): void {
  const payload = { kind, code, ...safeMeta(meta) };
  if (level === "error") logger.error(message, payload);
  else if (level === "warn") logger.warn(message, payload);
  else logger.info(message, payload);
}

export function logUploadEvent(
  code: string,
  meta: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info"
): void {
  logDomainEvent("upload", code, `upload:${code}`, meta, level);
}

export function logPaymentEvent(
  code: string,
  meta: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info"
): void {
  logDomainEvent("payment", code, `payment:${code}`, meta, level);
}
