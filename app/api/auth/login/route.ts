export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { sanitizeEmail } from "@/lib/sanitize";
import { auditActions } from "@/lib/audit";
import { db } from "@/lib/db";
import { validateSecureRequest } from "@/lib/security/middleware";
import { loginSchema } from "@/lib/security/validation-schemas";

export async function POST(request: NextRequest) {
  try {
    // Test database connection
    await db.testConnection();

    // A2: Log request details for debugging
    const requestHost = request.headers.get('host') || 'unknown';
    const requestOrigin = request.headers.get('origin') || 'unknown';
    console.log('[LOGIN ROUTE] Incoming request:', {
      host: requestHost,
      origin: requestOrigin,
      timestamp: new Date().toISOString()
    });

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'login',
      schema: loginSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      
      console.error('[LOGIN ROUTE] Security validation failed:', {
        error: security.error
      });
      
      return NextResponse.json({ 
        error: security.error
      }, { status });
    }

    const { email, password } = security.data as { email: string; password: string };

    // Sanitizare email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json(
        { error: "Email invalid" },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);

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
    if (result.user && typeof result.user.id === 'string' && typeof result.user.email === 'string') {
      await auditActions.userLogin(result.user.id, result.user.email, ip);
    }

    // Check if user is admin and require 2FA
    const isAdmin = result.user?.role === 'admin' || result.user?.email === 'admin@clickanunt.ro';
    if (isAdmin && process.env.ADMIN_2FA_ENABLED === 'true') {
      // Create temporary session token
      const sessionToken = require('crypto').randomBytes(32).toString('hex');
      // Store in temporary cache with 5 minute expiry
      // In production, use Redis
      
      return NextResponse.json(
        {
          requiresTwoFactor: true,
          sessionToken: sessionToken,
          message: "2FA verification required for admin access",
        },
        { status: 206 } // 206 Partial Content - needs additional auth
      );
    }

    // Setează cookie-uri HTTP-only pentru securitate
    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        message: "Conectat cu succes",
      },
      { status: 200 }
    );

    // Set access token cookie (7 zile) - Safari compatible
    response.cookies.set('accessToken', result.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',  // Changed from 'strict' to allow fetch() requests
      maxAge: 60 * 60 * 24 * 7, // 7 zile
      path: '/',
      priority: 'high',
    });

    // Set refresh token cookie (30 zile) - Safari compatible
    response.cookies.set('refreshToken', result.refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',  // Changed from 'strict' to allow fetch() requests
      maxAge: 60 * 60 * 24 * 30, // 30 zile
      path: '/',
      priority: 'high',
    });
    
    // Adaugă header-e CORS pentru Safari
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    return response;
  } catch (err: any) {
    console.error('❌ Login error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return NextResponse.json(
      { 
        error: "Eroare la autentificare",
        ...(process.env.NODE_ENV === 'development' && { debug: err.message })
      },
      { status: 500 }
    );
  }
}
