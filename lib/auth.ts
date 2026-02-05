/**
 * Authentication System cu JWT (Jose)
 * Securitate MAXIMĂ pentru owner control
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';
import { NextRequest } from 'next/server';

// Secret pentru JWT (din .env)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-this-in-production'
);

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
  user?: any;
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

/**
 * Verificare și decodare JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'autoplatform',
      audience: 'autoplatform-users',
    });

    return payload as TokenPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
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
 * Verifică user din request
 */
export async function getUserFromRequest(request: NextRequest): Promise<TokenPayload | null> {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }
  return await verifyToken(token);
}

/**
 * Login cu protecție bruteforce
 */
export async function authenticateUser(
  email: string,
  password: string,
  ip?: string
): Promise<AuthResult> {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

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

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = 5;

      let updateData: any = {
        failedLoginAttempts: newAttempts,
      };

      // Lock account after 5 failed attempts (30 minutes)
      if (newAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      if (newAttempts >= maxAttempts) {
        return {
          success: false,
          locked: true,
          lockedUntil: updateData.lockedUntil,
          error: `Prea multe încercări. Contul este blocat pentru 30 de minute.`,
        };
      }

      return {
        success: false,
        error: `Email sau parolă incorectă. Mai aveți ${maxAttempts - newAttempts} încercări.`,
      };
    }

    // Success! Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip || null,
      },
    });

    // Generate tokens
    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    const refreshToken = await generateRefreshToken(user.id, user.email, user.role);

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  } catch (error: any) {
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
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

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

    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
      accessToken: newAccessToken,
    };
  } catch (error) {
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
export async function verify2FACode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

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
