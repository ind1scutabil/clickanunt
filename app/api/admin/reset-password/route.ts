import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { validateSecureRequest } from '@/lib/security/middleware';
import { getUserFromRequest, hashPassword } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/rbac';
import type { UserRole } from '@prisma/client';

/**
 * POST /api/admin/reset-password
 * Admin-authenticated password reset. Requires ADMIN_RESET_TOKEN env
 * (no hard-coded fallback) in addition to admin RBAC + CSRF.
 */

const resetSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  token: z.string().min(32, 'Token required'),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request);
    if (!actor || !hasPermission(actor.role as UserRole, Permission.USERS_UPDATE_ANY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configured = process.env.ADMIN_RESET_TOKEN?.trim();
    if (!configured || configured.length < 32) {
      logger.error('ADMIN_RESET_TOKEN missing or too short — endpoint disabled');
      return NextResponse.json(
        { error: 'Admin password reset is not configured' },
        { status: 503 }
      );
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'api',
      schema: resetSchema,
    });
    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { email, newPassword, token } = security.data as z.infer<typeof resetSchema>;
    const normalizedEmail = email.toLowerCase().trim();

    const tokenOk =
      token.length === configured.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(configured));
    if (!tokenOk) {
      logger.warn({ adminId: actor.id }, 'Admin password reset attempted with invalid token');
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing token.' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    // Anti-enumeration: identical outcome shape whether user exists or not.
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the account exists, the password was updated.',
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    logger.info({ adminId: actor.id, targetUserId: user.id }, 'Admin password reset successfully');

    return NextResponse.json({
      success: true,
      message: 'If the account exists, the password was updated.',
    });
  } catch (error) {
    logger.error({ error }, 'Error in admin password reset');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
