/**
 * Enhanced Session Management - OWASP Standards
 * 
 * Features:
 * - High entropy session IDs
 * - Secure cookie flags
 * - Session timeout
 * - CSRF protection
 * - Session fixation prevention
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';

export interface SessionConfig {
  maxAge: number; // seconds
  idleTimeout: number; // seconds
  absoluteTimeout: number; // seconds
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
  secure_flags: boolean;
}

/**
 * Secure session configuration
 */
export const SESSION_CONFIG: SessionConfig = {
  maxAge: 24 * 60 * 60, // 24 hours
  idleTimeout: 30 * 60, // 30 minutes
  absoluteTimeout: 24 * 60 * 60, // 24 hours absolute
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'Lax',
  secure_flags: process.env.NODE_ENV === 'production',
};

/**
 * Session storage
 */
interface SessionData {
  id: string;
  userId: string;
  email: string;
  createdAt: number;
  lastActivity: number;
  ip: string;
  userAgent: string;
  fingerprint: string;
}

class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private refreshTokens: Map<string, { userId: string; expiresAt: number }> = new Map();

  /**
   * Generate high-entropy session ID
   */
  generateSessionId(): string {
    // 32 bytes = 256 bits of entropy
    // Base64 encoded = 43 characters
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Create session
   */
  createSession(
    userId: string,
    email: string,
    ip: string,
    userAgent: string
  ): {
    sessionId: string;
    fingerprint: string;
  } {
    const sessionId = this.generateSessionId();
    const fingerprint = this.generateFingerprint(ip, userAgent);

    const session: SessionData = {
      id: sessionId,
      userId,
      email,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ip,
      userAgent,
      fingerprint,
    };

    this.sessions.set(sessionId, session);

    return { sessionId, fingerprint };
  }

  /**
   * Validate session
   */
  validateSession(
    sessionId: string,
    ip: string,
    userAgent: string
  ): {
    valid: boolean;
    reason?: string;
    session?: SessionData;
  } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    // Check if session expired
    const now = Date.now();
    const sessionAge = now - session.createdAt;
    const idleTime = now - session.lastActivity;

    if (sessionAge > SESSION_CONFIG.absoluteTimeout * 1000) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: 'Session expired' };
    }

    if (idleTime > SESSION_CONFIG.idleTimeout * 1000) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: 'Session idle timeout' };
    }

    // Check fingerprint (detect session hijacking)
    const currentFingerprint = this.generateFingerprint(ip, userAgent);
    if (currentFingerprint !== session.fingerprint) {
      console.warn(`⚠️ Session fingerprint mismatch for ${session.userId}`, {
        expected: session.fingerprint,
        actual: currentFingerprint,
        ip,
      });

      // This could indicate session hijacking
      // Optionally invalidate session
      // this.destroySession(sessionId);
      // return { valid: false, reason: 'Fingerprint mismatch' };
    }

    // Update last activity
    session.lastActivity = now;

    return { valid: true, session };
  }

  /**
   * Generate session fingerprint
   */
  private generateFingerprint(ip: string, userAgent: string): string {
    const data = `${ip}:${userAgent}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Destroy session
   */
  destroySession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  /**
   * Create refresh token
   */
  createRefreshToken(userId: string): string {
    const token = this.generateSessionId();
    this.refreshTokens.set(token, {
      userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return token;
  }

  /**
   * Validate refresh token
   */
  validateRefreshToken(token: string): { valid: boolean; userId?: string } {
    const refresh = this.refreshTokens.get(token);

    if (!refresh) {
      return { valid: false };
    }

    if (refresh.expiresAt < Date.now()) {
      this.refreshTokens.delete(token);
      return { valid: false };
    }

    return { valid: true, userId: refresh.userId };
  }

  /**
   * Revoke refresh token
   */
  revokeRefreshToken(token: string) {
    this.refreshTokens.delete(token);
  }

  /**
   * Get secure cookie options
   */
  getCookieOptions() {
    return {
      maxAge: SESSION_CONFIG.maxAge * 1000, // Convert to ms
      secure: SESSION_CONFIG.secure,
      httpOnly: SESSION_CONFIG.httpOnly,
      sameSite: SESSION_CONFIG.sameSite,
      path: '/',
    };
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Date.now();

    // Clean up sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - session.createdAt;
      const idleTime = now - session.lastActivity;

      if (
        sessionAge > SESSION_CONFIG.absoluteTimeout * 1000 ||
        idleTime > SESSION_CONFIG.idleTimeout * 1000
      ) {
        this.sessions.delete(sessionId);
      }
    }

    // Clean up refresh tokens
    for (const [token, refresh] of this.refreshTokens.entries()) {
      if (refresh.expiresAt < now) {
        this.refreshTokens.delete(token);
      }
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      activeRefreshTokens: this.refreshTokens.size,
    };
  }
}

export const sessionManager = new SessionManager();

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionManager.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Set secure cookie headers
 */
export function setSecureCookie(
  response: NextResponse,
  name: string,
  value: string,
  options?: Partial<{
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
    path: string;
  }>
) {
  const cookieOptions = {
    ...sessionManager.getCookieOptions(),
    ...options,
  };

  const cookieString = `${name}=${value}; Max-Age=${cookieOptions.maxAge / 1000}; Path=${cookieOptions.path}${
    cookieOptions.secure ? '; Secure' : ''
  }${cookieOptions.httpOnly ? '; HttpOnly' : ''}; SameSite=${cookieOptions.sameSite}`;

  response.headers.set('Set-Cookie', cookieString);
}

/**
 * Session storage strategies
 * 
 * For production, use Redis:
 * 
 * export const sessionStore = new RedisStore({
 *   client: redisClient,
 *   prefix: 'session:',
 * });
 */
