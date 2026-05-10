/**
 * Authentication System cu JWT (Jose)
 * Securitate MAXIMĂ pentru owner control
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { normalizeJwtInput } from './jwt-normalize';
import { db } from './db';
import bcrypt from 'bcrypt';
import { NextRequest } from 'next/server';

// Secret pentru JWT (din .env)
const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW || JWT_SECRET_RAW.trim() === '') {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);

const JWT_ALGORITHM = 'HS256';
const TOKEN_EXPIRES_IN = '7d'; // 7 zile
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // 30 zile

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface AuthResult {
  success: boolean;
  user?: Record<string, unknown>;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  locked?: boolean;
  lockedUntil?: Date;
}

/**
 * Generare Access Token JWT
 */
export async function generateAccessToken(userId: string, email: string, role: string): Promise<string> {
  const token = await new SignJWT({
    userId,
    email,
    role,
    type: 'access',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRES_IN)
    .setIssuer('autoplatform')
    .setAudience('autoplatform-users')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generare Refresh Token JWT
 */
export async function generateRefreshToken(userId: string, email: string, role: string): Promise<string> {
  const token = await new SignJWT({
    userId,
    email,
    role,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .setIssuer('autoplatform')
    .setAudience('autoplatform-users')
    .sign(JWT_SECRET);

  return token;
}

export { normalizeJwtInput };

/**
 * Verificare și decodare JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const normalized = normalizeJwtInput(token);
  if (!normalized) return null;

  const strictOpts = {
    issuer: 'autoplatform',
    audience: 'autoplatform-users',
    clockTolerance: 120,
  } as const;

  try {
    const { payload } = await jwtVerify(normalized, JWT_SECRET, strictOpts);
    return payload as TokenPayload;
  } catch {
    try {
      /** Tokenuri vechi / ceas server: fără issuer obligatoriu, tot HS256 + semnătură validă */
      const { payload } = await jwtVerify(normalized, JWT_SECRET, {
        clockTolerance: 120,
      });
      return payload as TokenPayload;
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      console.error('[VERIFY_TOKEN_FAILED]', {
        message: err?.message,
        code: err?.code,
        tokenLength: normalized.length,
        secretConfigured: !!process.env.JWT_SECRET,
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }
}

/**
 * Extrage token din headers (Bearer token)
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer "
}

/**
 * Verifică user din request - returnează payload sau user complet
 */
export async function getUserFromRequest(request: NextRequest) {
  const cookieToken = request.cookies.get('accessToken')?.value?.trim() || null;
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7).trim() || null
    : null;

  /** Încearcă fiecare token distinct (Bearer apoi cookie); primul JWT valid + user în DB câștigă */
  const raw = [headerToken, cookieToken].filter(
    (t): t is string => typeof t === 'string' && t.length > 0
  );
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const t of raw) {
    if (!seen.has(t)) {
      seen.add(t);
      candidates.push(t);
    }
  }

  for (const token of candidates) {
    const payload = await verifyToken(token);
    if (!payload?.userId) continue;
    const user = await db.findUserById(payload.userId);
    if (user) return user;
  }

  return null;
}

/**
 * Login cu protecție bruteforce - Enterprise Level
 */
export async function authenticateUser(
  email: string,
  password: string,
  ip?: string
): Promise<AuthResult> {
  try {
    // Test database connection
    await db.testConnection();

    // Find user
    const user = await db.findUserByEmail(email);

    if (!user) {
      return {
        success: false,
        error: 'Email sau parolă incorectă',
      };
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return {
        success: false,
        locked: true,
        lockedUntil: user.lockedUntil,
        error: `Contul este blocat până la ${user.lockedUntil.toLocaleString('ro-RO')}`,
      };
    }

    // Check if banned
    if (user.isBanned) {
      return {
        success: false,
        error: `Contul este banat. Motiv: ${user.banReason || 'Necunoscut'}`,
      };
    }

    if ("deletedAt" in user && user.deletedAt) {
      return {
        success: false,
        error: "Contul nu mai este disponibil.",
      };
    }

    // Verify password (malformed bcrypt hashes must not throw — treat as wrong password)
    const pwdHashRaw = typeof user.password === 'string' ? user.password.trim() : '';
    if (!pwdHashRaw || !pwdHashRaw.startsWith('$2')) {
      console.error('[AUTH] User has no valid bcrypt hash:', user.id);
      return {
        success: false,
        error: 'Email sau parolă incorectă',
      };
    }

    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, pwdHashRaw);
    } catch (e) {
      console.error('[AUTH] bcrypt.compare failed:', e);
      return {
        success: false,
        error: 'Email sau parolă incorectă',
      };
    }

    if (!isValid) {
      // Increment failed attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = 5;

      const updateData: Record<string, unknown> = {
        failedLoginAttempts: newAttempts,
      };

      // Lock account after 5 failed attempts (30 minutes)
      if (newAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await db.updateUser(user.id, updateData);

      if (newAttempts >= maxAttempts) {
        return {
          success: false,
          locked: true,
          lockedUntil: updateData.lockedUntil as Date | undefined,
          error: `Prea multe încercări. Contul este blocat pentru 30 de minute.`,
        };
      }

      return {
        success: false,
        error: `Email sau parolă incorectă. Mai aveți ${maxAttempts - newAttempts} încercări.`,
      };
    }

    // Success! Reset failed attempts and update last login
    await db.updateUser(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip || null,
    });

    // Generate tokens
    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await generateRefreshToken(user.id, user.email, user.role);

    // Remove password from user object
    const { password: userPassword, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  } catch (error: unknown) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Eroare la autentificare',
    };
  }
}

/**
 * Refresh access token folosind refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResult> {
  try {
    const payload = await verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return {
        success: false,
        error: 'Token invalid',
      };
    }

    // Verifică dacă user-ul mai există și nu e banat
    const user = await db.findUserById(payload.userId);

    if (!user) {
      return {
        success: false,
        error: 'Utilizator nu există',
      };
    }

    if (user.isBanned) {
      return {
        success: false,
        error: 'Contul este banat',
      };
    }

    // Generează token nou
    const newAccessToken = await generateAccessToken(user.id, user.email, user.role);

    const { password: _password, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
      accessToken: newAccessToken,
    };
  } catch (_error: unknown) {
    return {
      success: false,
      error: 'Eroare la refresh token',
    };
  }
}

/**
 * Hash parolă cu bcrypt (pentru register/reset)
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Verifică 2FA code (dacă e activat)
 */
export async function verify2FACode(_userId: string, _code: string): Promise<boolean> {
  const user = await db.findUserById(_userId);

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return false;
  }

  // TODO: Implementare speakeasy.totp.verify
  // const speakeasy = require('speakeasy');
  // return speakeasy.totp.verify({
  //   secret: user.twoFactorSecret,
  //   encoding: 'base32',
  //   token: code,
  //   window: 2,
  // });

  return false; // Placeholder
}
