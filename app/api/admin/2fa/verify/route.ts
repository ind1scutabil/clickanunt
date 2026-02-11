import { NextRequest, NextResponse } from 'next/server';
import { verifyTOTPRFC } from '@/lib/totp';
import { validateSecureRequest } from '@/lib/security/middleware';
import { z } from 'zod';

export const runtime = 'nodejs';

const verify2FASchema = z.object({
  secret: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: verify2FASchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { secret, code } = security.data as { secret: string; code: string };

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
