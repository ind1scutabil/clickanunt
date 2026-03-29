/**
 * API Route: Admin - Ridică suspendarea temporară
 */

export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { hasPermission, Permission, canModifyUser } from '@/lib/rbac';
import { validateSecureRequest } from '@/lib/security/middleware';
import type { UserRole } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminUser = await getUserFromRequest(request as NextRequest);

    if (!adminUser || !hasPermission(adminUser.role as UserRole, Permission.USERS_BAN)) {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
    }

    const security = await validateSecureRequest(request, { requireCSRF: true });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Utilizatorul nu există' }, { status: 404 });
    }

    if (!canModifyUser(adminUser.role as UserRole, targetUser.role as UserRole)) {
      return NextResponse.json({ error: 'Nu poți modifica acest utilizator' }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        moderationSuspendedUntil: null,
        moderationSuspensionReason: null,
        moderationSuspendedBy: null,
      },
      select: {
        id: true,
        email: true,
        moderationSuspendedUntil: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Suspendarea a fost ridicată',
      user: updated,
    });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    return NextResponse.json({ error: 'Eroare la ridicarea suspendării' }, { status: 500 });
  }
}
