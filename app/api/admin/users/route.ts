/**
 * API Route: Admin - Listare Users
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    console.log('[ADMIN/USERS] Auth check:', {
      hasUser: !!user,
      userEmail: user?.email,
      userRole: user?.role,
      hasUsersViewPermission: user ? hasPermission(user.role as UserRole, Permission.USERS_VIEW_ALL) : false,
      timestamp: new Date().toISOString()
    });

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_VIEW_ALL)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const isBanned = searchParams.get('isBanned');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (role) where.role = role;
    if (isBanned !== null) where.isBanned = isBanned === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          trustScore: true,
          isBanned: true,
          bannedAt: true,
          bannedBy: true,
          banReason: true,
          createdAt: true,
          lastLoginAt: true,
          failedLoginAttempts: true,
          creditsBalance: true,
          freeBoostsRemaining: true,
          promotionDiscountPercent: true,
          _count: {
            select: {
              listings: true,
              reports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      users,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea utilizatorilor" },
      { status: 500 }
    );
  }
}
