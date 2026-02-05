/**
 * API Route: Register nou user
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { sanitizeEmail, isValidPassword } from "@/lib/sanitize";
import { rateLimitPresets, getClientIp } from "@/lib/rateLimit";
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

    // Validare parolă
    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          error: "Parola trebuie să aibă minimum 8 caractere, cel puțin o literă și o cifră",
        },
        { status: 400 }
      );
    }

    // Rate limiting: 3 înregistrări per oră
    const ip = getClientIp(request);
    const rateLimit = rateLimitPresets.register(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Prea multe înregistrări. Te rugăm să aștepți ${rateLimit.retryAfter} secunde.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Verifică dacă email-ul există deja
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un cont cu acest email există deja" },
        { status: 409 }
      );
    }

    // Hash parolă
    const hashedPassword = await hashPassword(password);

    // Creează user
    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        role: 'user', // Default role
        trustScore: 50,
      },
    });

    // Generează tokens
    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await generateRefreshToken(user.id, user.email, user.role);

    // Audit log
    await auditActions.userCreated(
      { userId: user.id, email: user.email, role: user.role } as any,
      user
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        message: "Cont creat cu succes",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: "Eroare la crearea contului" },
      { status: 500 }
    );
  }
}
