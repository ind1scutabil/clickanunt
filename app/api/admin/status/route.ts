import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/status
 * Check if admin exists and return information
 */
export async function GET(request: NextRequest) {
  try {
    // Check if any admin exists
    const adminCount = await prisma.user.count({
      where: { role: 'admin' },
    });

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      adminExists: adminCount > 0,
      adminCount,
      admins,
    });
  } catch (error) {
    logger.error({ error }, 'Error checking admin status');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
