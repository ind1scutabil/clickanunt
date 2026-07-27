import { NextRequest, NextResponse } from 'next/server';
import { generate2FASecret } from '@/lib/2fa';
import { RedisUnavailableError } from '@/lib/redis';
import { validateSecureRequest } from '@/lib/security/middleware';
import { getUserFromRequest } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/rbac';
import type { UserRole } from '@prisma/client';
import { z } from 'zod';
import { uuidSchema } from '@/lib/security/validation-schemas';

export const runtime = 'nodejs';

const generate2FASchema = z.object({
  userId: uuidSchema,
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request);
    if (!actor) {
      return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'api',
      schema: generate2FASchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { userId } = security.data as { userId: string };

    // Only self-setup, or admin with USERS_UPDATE_ANY for another user.
    const isSelf = actor.id === userId;
    const isAdmin =
      hasPermission(actor.role as UserRole, Permission.USERS_UPDATE_ANY);
    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
    }

    const { secret, otpauthUrl, backupCodes } = await generate2FASecret(userId);

    return NextResponse.json({
      secret,
      otpauthUrl,
      backupCodes,
      message: 'Scandează codul QR cu Google Authenticator, Microsoft Authenticator, sau Authy',
    });
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      return NextResponse.json(
        { error: '2FA temporar indisponibil (Redis offline)' },
        { status: 503 }
      );
    }

    console.error('Error generating 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to generate 2FA secret' },
      { status: 500 }
    );
  }
}
