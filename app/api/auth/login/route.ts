export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { rateLimitPresets, getClientIp } from "@/lib/rateLimit";
import { sanitizeEmail } from "@/lib/sanitize";
import { auditActions } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validare input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email și parola sunt necesare" },
        { status: 400 }
      );
    }

    // Sanitizare email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json(
        { error: "Email invalid" },
        { status: 400 }
      );
    }

    // Rate limiting: 5 încercări per 15 minute
    const ip = getClientIp(request);
    const rateLimit = rateLimitPresets.login(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Prea multe încercări de login. Te rugăm să aștepți ${rateLimit.retryAfter} secunde.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Autentificare cu protecție bruteforce
    const result = await authenticateUser(sanitizedEmail, password, ip);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          locked: result.locked,
          lockedUntil: result.lockedUntil,
        },
        { status: result.locked ? 423 : 401 }
      );
    }

    // Audit log
    await auditActions.userLogin(result.user!.id, result.user!.email, ip);

    return NextResponse.json(
      {
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        message: "Conectat cu succes",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: "Eroare la autentificare" },
      { status: 500 }
    );
  }
}
