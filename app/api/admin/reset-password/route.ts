import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/reset-password
 * Temporary endpoint to reset admin password via secure token
 * This bypasses email and allows direct password reset with a secure token
 */

const resetSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  token: z.string().optional(),
});

// Secret token for admin reset (should be environment variable in production)
const ADMIN_RESET_TOKEN = process.env.ADMIN_RESET_TOKEN || 'temporary-admin-reset-token-change-me';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = resetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, newPassword, token } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify the token for security
    if (!token || token !== ADMIN_RESET_TOKEN) {
      logger.warn({ email: normalizedEmail }, 'Admin password reset attempted with invalid token');
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing token.' },
        { status: 401 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      logger.warn({ email: normalizedEmail }, 'Admin password reset attempted for non-existent user');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'Admin password reset successfully');

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now login with the new password.',
    });
  } catch (error) {
    logger.error({ error }, 'Error in admin password reset');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
