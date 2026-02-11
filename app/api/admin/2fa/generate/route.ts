import { NextRequest, NextResponse } from 'next/server';
import { generate2FASecret } from '@/lib/2fa';
import { RedisUnavailableError } from '@/lib/redis';
import { validateSecureRequest } from '@/lib/security/middleware';
import { z } from 'zod';

export const runtime = 'nodejs';

const generate2FASchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: generate2FASchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { userId } = security.data as { userId: string };

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
