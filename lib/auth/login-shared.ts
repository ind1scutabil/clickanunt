/**
 * Shared password login flow for web (/api/auth/login) and mobile (/api/auth/mobile-login).
 * Same authentication, audit, 2FA gate, analytics — response packaging differs (cookies vs JSON-only).
 */
import type { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import validator from "validator";
import { auditActions } from "@/lib/audit";
import { ANALYTICS_EVENT, recordAnalyticsEvent } from "@/lib/analytics-events";
import crypto from "crypto";

export type LoginSharedResult =
  | {
      kind: "success";
      user: Record<string, unknown>;
      accessToken: string;
      refreshToken: string;
    }
  | { kind: "failure"; status: number; body: Record<string, unknown> }
  | { kind: "two_factor"; status: number; body: Record<string, unknown> };

export async function runSharedPasswordLogin(
  request: NextRequest,
  email: string,
  password: string
): Promise<LoginSharedResult> {
  const loginEmail = email.trim().toLowerCase();
  if (!validator.isEmail(loginEmail)) {
    return { kind: "failure", status: 400, body: { error: "Email invalid" } };
  }

  const ip = getClientIp(request);
  const result = await authenticateUser(loginEmail, password, ip);

  if (!result.success) {
    return {
      kind: "failure",
      status: result.locked ? 423 : 401,
      body: {
        error: result.error,
        locked: result.locked,
        lockedUntil: result.lockedUntil,
      },
    };
  }

  if (result.user && typeof result.user.id === "string" && typeof result.user.email === "string") {
    await auditActions.userLogin(result.user.id, result.user.email, ip);
  }

  const isAdmin =
    result.user?.role === "admin" ||
    result.user?.role === "owner" ||
    result.user?.email === "daniel.enoiu29@gmail.com";
  if (isAdmin && process.env.ADMIN_2FA_ENABLED === "true") {
    const sessionToken = crypto.randomBytes(32).toString("hex");
    return {
      kind: "two_factor",
      status: 206,
      body: {
        requiresTwoFactor: true,
        sessionToken,
        message: "2FA verification required for admin access",
      },
    };
  }

  if (result.user && typeof result.user.id === "string") {
    void recordAnalyticsEvent({
      eventType: ANALYTICS_EVENT.login_success,
      userId: result.user.id,
      metadata: { ip: ip ?? null },
      request,
    });
  }

  return {
    kind: "success",
    user: result.user as Record<string, unknown>,
    accessToken: result.accessToken!,
    refreshToken: result.refreshToken!,
  };
}
