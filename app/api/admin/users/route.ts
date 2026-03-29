/**
 * API Route: Admin - Listare Users
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { Prisma, UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    console.log('[ADMIN/USERS] === NEW REQUEST ===');
    const adminUser = await getUserFromRequest(request);
    if (!adminUser || !hasPermission(adminUser.role as UserRole, Permission.USERS_VIEW_ALL)) {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const isBannedParam = searchParams.get('isBanned');
    const sort = searchParams.get('sort') || 'created';
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
    /** limit=0 sau NaN returna 0 rânduri — forțăm minim 1, max 2000 (moderare: mulți useri seed) */
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 2000) : 50;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (isBannedParam === 'true') where.isBanned = true;
    else if (isBannedParam === 'false') where.isBanned = false;

    /** activity: ultimul login mai întâi (useri reali activi), apoi data creării */
    const orderBy: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[] =
      sort === 'activity'
        ? [
            { lastLoginAt: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ]
        : { createdAt: 'desc' };

    console.log('[ADMIN/USERS] Query params:', { role, isBanned: isBannedParam, sort, limit, offset });
    console.log('[ADMIN/USERS] Where clause:', where);

    console.log('[ADMIN/USERS] About to execute Prisma query...');
    
    let users, total;
    try {
      // Try the full query with _count
      [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            phoneVerified: true,
            emailVerified: true,
            accountType: true,
            role: true,
            isBanned: true,
            trustScore: true,
            createdAt: true,
            lastLoginAt: true,
            lastActiveAt: true,
            lastLoginIp: true,
            creditsBalance: true,
            freeBoostsRemaining: true,
            promotionDiscountPercent: true,
            moderationSuspendedUntil: true,
            moderationSuspensionReason: true,
            moderationSuspendedBy: true,
            _count: {
              select: {
                listings: true,
                reports: true,
              },
            },
          },
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ]);
      console.log('[ADMIN/USERS] Full query successful');
    } catch (dbError) {
      console.error('[ADMIN/USERS] Full query failed, trying simplified query:', dbError);
      
      // Fallback to simplified query
      [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            phoneVerified: true,
            emailVerified: true,
            accountType: true,
            role: true,
            isBanned: true,
            trustScore: true,
            createdAt: true,
            lastLoginAt: true,
            lastActiveAt: true,
            lastLoginIp: true,
            creditsBalance: true,
            freeBoostsRemaining: true,
            promotionDiscountPercent: true,
            moderationSuspendedUntil: true,
            moderationSuspensionReason: true,
            moderationSuspendedBy: true,
          },
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ]);
      console.log('[ADMIN/USERS] Simplified query successful');
    }

    console.log('[ADMIN/USERS] Query results:', { usersCount: users.length, total });
    console.log('[ADMIN/USERS] First user sample:', users[0] ? {
      id: users[0].id,
      email: users[0].email,
      role: users[0].role,
      isBanned: users[0].isBanned
    } : 'No users found');

    return NextResponse.json({
      success: true,
      users,
      total,
      limit,
      offset,
      sort,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea utilizatorilor" },
      { status: 500 }
    );
  }
}
