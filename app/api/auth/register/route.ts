/**
 * API Route: Register nou user - Enterprise Level
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { sanitizeEmail, isValidPassword } from "@/lib/sanitize";
import { rateLimitPresets, getClientIp } from "@/lib/rateLimit";
import { auditActions } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    // Test database connection
    await db.testConnection();

    const body = await request.json();
    const { email, password, name } = body;

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
    const existingUser = await db.user.findUnique({
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
    const user = await db.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        name: name || null,
        role: 'user', // Default role
        trustScore: 50,
        emailVerified: false,
        phoneVerified: false,
        isBanned: false,
      },
    });

    // Generează tokens
    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await generateRefreshToken(user.id, user.email, user.role);

    // Audit log (skip if in-memory mode)
    try {
      await auditActions.userCreated(
        { userId: user.id, email: user.email, role: user.role } as any,
        user
      );
    } catch (auditError) {
      console.warn('Audit log failed:', auditError);
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Set cookies pentru autentificare automată
    const response = NextResponse.json(
      {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        message: "Cont creat cu succes! Bine ai venit!",
        mode: db.isUsingInMemory() ? 'development' : 'production',
      },
      { status: 201 }
    );

    // Set access token cookie (7 zile) - Safari compatible
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 zile
      path: '/',
      priority: 'high',
    });

    // Set refresh token cookie (30 zile)
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 zile
      path: '/',
      priority: 'high',
    });

    // Add CORS headers
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  } catch (error: any) {
    console.error('❌ Register error:', error);
    
    // Detailed error response pentru development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Eroare: ${error.message}` 
      : 'Eroare la crearea contului. Vă rugăm încercați din nou.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false,
        ...(process.env.NODE_ENV === 'development' && { debug: error.stack })
      },
      { status: 500 }
    );
  }
}
