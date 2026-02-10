import { NextResponse } from 'next/server';
import { generate2FASecret } from '@/lib/2fa';
import { RedisUnavailableError } from '@/lib/redis';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
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
