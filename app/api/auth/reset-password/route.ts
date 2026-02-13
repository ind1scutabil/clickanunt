import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';

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
    const body = await request.json();
    
    // Validare
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten();
      return NextResponse.json(
        { 
          error: 'Date invalide', 
          details: errors.fieldErrors 
        },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

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

    if (!user) {
      logger.warn({ tokenHash: resetTokenHash }, 'Invalid or expired reset token');
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

    logger.info({ userId: user.id, email: user.email }, 'Password reset successfully');

    return NextResponse.json({
      success: true,
      message: 'Parola a fost resetată cu succes. Puteți acum să vă autentificați.',
    });
  } catch (error: any) {
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
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        valid: false,
        error: 'Link-ul este invalid sau a expirat',
      });
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error verifying reset token');
    return NextResponse.json(
      { valid: false, error: 'Eroare la verificare' },
      { status: 500 }
    );
  }
}
