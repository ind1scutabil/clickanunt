/**
 * Session & Token Management - OWASP ASVS V3
 * 
 * Features:
 * - Secure JWT token generation
 * - Token refresh mechanism
 * - Session fixation prevention
 * - Token revocation support
 * - Secure cookie configuration
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-this-too';

/**
 * Token expiration times
 */
export const TOKEN_EXPIRY = {
  ACCESS: '15m', // 15 minutes
  REFRESH: '7d', // 7 days
  EMAIL_VERIFICATION: '24h',
  PASSWORD_RESET: '1h',
};

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
  sessionId?: string;
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(
    {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRY.ACCESS as jwt.SignOptions['expiresIn'],
      issuer: 'clickanunt.ro',
      audience: 'clickanunt-users',
    } as jwt.SignOptions
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: JwtPayload): string {
  // Add session ID to prevent token reuse after logout
  const sessionId = crypto.randomBytes(16).toString('hex');
  
  return jwt.sign(
    {
      ...payload,
      sessionId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: TOKEN_EXPIRY.REFRESH as jwt.SignOptions['expiresIn'],
      issuer: 'clickanunt.ro',
      audience: 'clickanunt-users',
    } as jwt.SignOptions
  );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'clickanunt.ro',
      audience: 'clickanunt-users',
    }) as JwtPayload & { type: string };
    
    if (decoded.type !== 'access') {
      return null;
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'clickanunt.ro',
      audience: 'clickanunt-users',
    }) as JwtPayload & { type: string };
    
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    // TODO: Check if session is revoked in database
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    console.error('Refresh token verification error:', error);
    return null;
  }
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken(userId: string, email: string): string {
  return jwt.sign(
    {
      userId,
      email,
      type: 'email-verification',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRY.EMAIL_VERIFICATION as jwt.SignOptions['expiresIn'],
      issuer: 'clickanunt.ro',
    } as jwt.SignOptions
  );
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(userId: string, email: string): string {
  return jwt.sign(
    {
      userId,
      email,
      type: 'password-reset',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRY.PASSWORD_RESET as jwt.SignOptions['expiresIn'],
      issuer: 'clickanunt.ro',
    } as jwt.SignOptions
  );
}

/**
 * Verify special token (email/password reset)
 */
export function verifySpecialToken(
  token: string,
  expectedType: 'email-verification' | 'password-reset'
): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'clickanunt.ro',
    }) as { userId: string; email: string; type: string };
    
    if (decoded.type !== expectedType) {
      return null;
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    console.error('Special token verification error:', error);
    return null;
  }
}

/**
 * Secure cookie options
 */
export function getSecureCookieOptions(options: {
  maxAge?: number;
  path?: string;
} = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: options.path || '/',
    maxAge: options.maxAge || 60 * 60 * 24 * 7, // 7 days default
    domain: isProduction ? '.clickanunt.ro' : undefined,
  };
}

/**
 * Token rotation for refresh tokens
 */
export function shouldRotateToken(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { iat: number; exp: number };
    
    if (!decoded || !decoded.iat || !decoded.exp) {
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - decoded.iat;
    const tokenLifetime = decoded.exp - decoded.iat;
    
    // Rotate if token is more than 50% through its lifetime
    return tokenAge > tokenLifetime * 0.5;
  } catch {
    return true;
  }
}

/**
 * Session fingerprint generation
 */
export function generateSessionFingerprint(
  userAgent: string,
  ip: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${userAgent}:${ip}`)
    .digest('hex');
}

/**
 * Validate session fingerprint
 */
export function validateSessionFingerprint(
  stored: string,
  current: string
): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(stored),
    Buffer.from(current)
  );
}

/**
 * Generate secure random token (for one-time use cases)
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash token for storage
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Token blacklist interface (for revoked tokens)
 */
export class TokenBlacklist {
  private blacklist = new Map<string, number>(); // token hash -> expiry timestamp
  
  constructor() {
    // Clean up expired tokens every hour
    setInterval(() => {
      const now = Date.now();
      for (const [token, expiry] of this.blacklist.entries()) {
        if (expiry < now) {
          this.blacklist.delete(token);
        }
      }
    }, 60 * 60 * 1000);
  }
  
  /**
   * Add token to blacklist
   */
  revoke(token: string, expiryMs: number): void {
    const tokenHash = hashToken(token);
    this.blacklist.set(tokenHash, Date.now() + expiryMs);
  }
  
  /**
   * Check if token is revoked
   */
  isRevoked(token: string): boolean {
    const tokenHash = hashToken(token);
    const expiry = this.blacklist.get(tokenHash);
    
    if (!expiry) {
      return false;
    }
    
    if (expiry < Date.now()) {
      this.blacklist.delete(tokenHash);
      return false;
    }
    
    return true;
  }
}

/**
 * Global token blacklist instance
 */
export const tokenBlacklist = new TokenBlacklist();
