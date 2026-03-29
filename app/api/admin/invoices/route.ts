/**
 * API: Admin Invoices - List and Filter
 * GET /api/admin/invoices
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability';
import { Permission, userHasPermission } from '@/lib/rbac';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, deletedAt: null },
    });

    if (!user || !userHasPermission(user, Permission.INVOICES_VIEW_ALL)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view invoices' },
        { status: 403 }
      );
    }

    // Get filters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const dateRange = searchParams.get('dateRange') || 'month';
    const search = searchParams.get('search') || '';

    // Build query
    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    // Date range filter
    const now = new Date();
    if (dateRange === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.issuedAt = { gte: startOfDay };
    } else if (dateRange === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      where.issuedAt = { gte: startOfWeek };
    } else if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      where.issuedAt = { gte: startOfMonth };
    }

    // Search filter
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    // Format response
    const formatted = invoices.map((inv: { id: string; invoiceNumber: string; userId: string; user: { name: string | null; email: string }; amount: number; currency: string; status: string; items: unknown; metadata: unknown; issuedAt: Date | null; paidAt: Date | null; dueAt: Date | null; createdAt: Date }) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      userId: inv.userId,
      userName: inv.user.name || 'Unknown',
      userEmail: inv.user.email,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      items: inv.items,
      metadata: inv.metadata,
      issuedAt: inv.issuedAt,
      paidAt: inv.paidAt,
      dueAt: inv.dueAt,
      createdAt: inv.createdAt,
    }));

    logger.info('Admin invoices listed', {
      userId: decoded.userId,
      count: formatted.length,
      filters: { status, dateRange, search: !!search },
    });

    return NextResponse.json({
      invoices: formatted,
      count: formatted.length,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to list invoices';
    logger.error('Failed to list invoices', { error });
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
