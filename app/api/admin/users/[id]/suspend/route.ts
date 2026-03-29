/**
 * API Route: Admin - Suspendare temporară (nu poate publica anunțuri)
 */

export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { hasPermission, Permission, canModifyUser } from '@/lib/rbac';
import { validateSecureRequest } from '@/lib/security/middleware';
import { z } from 'zod';
import type { UserRole } from '@prisma/client';

const suspendSchema = z.object({
  durationHours: z.number().int().min(1).max(8760),
  reason: z.string().min(1).max(2000),
});

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

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: suspendSchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { durationHours, reason } = security.data as z.infer<typeof suspendSchema>;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Utilizatorul nu există' }, { status: 404 });
    }

    if (!canModifyUser(adminUser.role as UserRole, targetUser.role as UserRole)) {
      return NextResponse.json({ error: 'Nu poți modifica acest utilizator' }, { status: 403 });
    }

    if (targetUser.isBanned) {
      return NextResponse.json(
        { error: 'Utilizatorul este deja blocat permanent. Deblochează înainte sau folosește alt flux.' },
        { status: 400 }
      );
    }

    const until = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        moderationSuspendedUntil: until,
        moderationSuspensionReason: reason,
        moderationSuspendedBy: adminUser.id,
      },
      select: {
        id: true,
        email: true,
        moderationSuspendedUntil: true,
        moderationSuspensionReason: true,
        moderationSuspendedBy: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Utilizator suspendat temporar',
      user: updated,
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    return NextResponse.json({ error: 'Eroare la suspendare' }, { status: 500 });
  }
}
