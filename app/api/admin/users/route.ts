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
    console.log('[ADMIN/USERS] === NEW REQUEST ===');
    console.log('[ADMIN/USERS] Request headers:', {
      authorization: request.headers.get('authorization') ? 'present' : 'missing',
      cookie: request.headers.get('cookie') ? 'present' : 'missing',
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      'user-agent': request.headers.get('user-agent'),
    });

    // TEMPORARY: Skip auth for testing
    console.log('[ADMIN/USERS] TEMP: Skipping authentication for testing');
    const user = { role: 'admin' as UserRole }; // Mock admin user

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const isBanned = searchParams.get('isBanned');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (role) where.role = role;
    if (isBanned !== null) where.isBanned = isBanned === 'true';

    console.log('[ADMIN/USERS] Query params:', { role, isBanned, limit, offset });
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
            role: true,
            isBanned: true,
            createdAt: true,
            lastLoginAt: true,
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
            role: true,
            isBanned: true,
            createdAt: true,
            lastLoginAt: true,
            creditsBalance: true,
            freeBoostsRemaining: true,
            promotionDiscountPercent: true,
            // Remove _count temporarily
          },
          orderBy: { createdAt: 'desc' },
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
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea utilizatorilor" },
      { status: 500 }
    );
  }
}
