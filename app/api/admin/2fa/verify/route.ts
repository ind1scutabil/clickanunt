import { NextResponse } from 'next/server';
import { verifyTOTPRFC } from '@/lib/totp';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { secret, code } = await request.json();

    if (!secret || !code) {
      return NextResponse.json(
        { error: 'Secret și code sunt necesare' },
        { status: 400 }
      );
    }

    // Verify TOTP code
    const isValid = verifyTOTPRFC(secret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Cod invalid sau expirat' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: '2FA verificat cu succes',
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
