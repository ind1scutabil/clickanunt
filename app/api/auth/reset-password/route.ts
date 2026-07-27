import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { validateSecureRequest } from '@/lib/security/middleware';
import { bumpSessionVersion } from '@/lib/auth/session-version';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token lipsă'),
  password: z
    .string()
    .min(8, 'Parola trebuie să aibă minim 8 caractere')
    .regex(/[A-Z]/, 'Parola trebuie să conțină cel puțin o literă mare')
    .regex(/[a-z]/, 'Parola trebuie să conțină cel puțin o literă mică')
    .regex(/[0-9]/, 'Parola trebuie să conțină cel puțin o cifră'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Parolele nu se potrivesc',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: false,
      rateLimit: 'login',
      schema: resetPasswordSchema,
    });
    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.validationError
          ? 400
          : 400;
      return NextResponse.json(
        { error: security.error || 'Date invalide' },
        { status }
      );
    }

    const { token, password } = security.data as {
      token: string;
      password: string;
    };

    // Hash token pentru comparație
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Caută user cu token valid și neexpirat
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: {
          gt: new Date(), // Token neexpirat
        },
      },
    });

    if (!user || user.isBanned || user.deletedAt) {
      logger.warn('Invalid, expired, or ineligible reset token');
      return NextResponse.json(
        { error: 'Link-ul de resetare este invalid sau a expirat. Solicitați unul nou.' },
        { status: 400 }
      );
    }

    // Hash parolă nouă
    const hashedPassword = await hashPassword(password);

    // Actualizează parola și șterge token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        // Reset failed login attempts
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Revoke all outstanding sessions — user must log in again.
    await bumpSessionVersion(user.id);

    logger.info({ userId: user.id }, 'Password reset successfully');

    return NextResponse.json({
      success: true,
      message: 'Parola a fost resetată cu succes. Puteți acum să vă autentificați.',
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Error in reset-password endpoint');
    return NextResponse.json(
      { error: 'A apărut o eroare. Vă rugăm încercați din nou.' },
      { status: 500 }
    );
  }
}

// GET pentru verificare token (opțional, pentru UX)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token lipsă' },
        { status: 400 }
      );
    }

    // Hash token
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Verifică dacă token-ul există și e valid
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        isBanned: true,
        deletedAt: true,
      },
    });

    if (!user || user.isBanned || user.deletedAt) {
      return NextResponse.json({
        valid: false,
        error: 'Link-ul este invalid sau a expirat',
      });
    }

    return NextResponse.json({
      valid: true,
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Error verifying reset token');
    return NextResponse.json(
      { valid: false, error: 'Eroare la verificare' },
      { status: 500 }
    );
  }
}
