import { z } from 'zod';
import crypto from 'crypto';

/**
 * CSRF Token Management
 * Generates and validates CSRF tokens for form submissions
 */

export class CSRFProtection {
  private static TOKEN_STORE = new Map<string, { token: string; timestamp: number }>();
  private static readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    this.TOKEN_STORE.set(sessionId, { token, timestamp });
    return token;
  }

  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.TOKEN_STORE.get(sessionId);
    if (!stored) return false;

    // Check expiry
    if (Date.now() - stored.timestamp > this.TOKEN_EXPIRY) {
      this.TOKEN_STORE.delete(sessionId);
      return false;
    }

    // Validate token matches
    return stored.token === token;
  }

  static revokeToken(sessionId: string): void {
    this.TOKEN_STORE.delete(sessionId);
  }
}

/**
 * Request Validation Schemas
 * Using Zod for strict input validation
 */

export const listingCreateSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(5000),
  price: z.number().min(0).max(99999999),
  category: z.string().min(1),
  condition: z.enum(['new', 'used', 'refurbished', 'for_parts']),
  images: z.array(z.string().url()).min(1).max(10),
  location: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  _csrf: z.string().min(32),
});

export const messageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  listingId: z.string().uuid().optional(),
  _csrf: z.string().min(32),
});

export const reportSchema = z.object({
  listingId: z.string().uuid(),
  reason: z.enum(['spam', 'fraud', 'inappropriate', 'duplicate', 'other']),
  details: z.string().max(1000),
  evidence: z.array(z.string().url()).optional(),
  _csrf: z.string().min(32),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
});

/**
 * Sanitization helpers
 */

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML-like tags
    .slice(0, 5000); // Limit length
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validation helper
 */

export async function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): Promise<{ valid: boolean; data?: T; error?: string }> {
  try {
    const validData = await schema.parseAsync(data);
    return { valid: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return {
        valid: false,
        error: errorMessages,
      };
    }
    return { valid: false, error: 'Validation failed' };
  }
}
