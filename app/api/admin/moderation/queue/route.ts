/**
 * API Route: Admin - Moderation Queue
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.MODERATION_VIEW_QUEUE)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const assignedTo = searchParams.get('assignedTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = { status };
    if (assignedTo) where.assignedTo = assignedTo;

    const [items, total] = await Promise.all([
      prisma.moderationQueue.findMany({
        where,
        include: {
          moderator: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          listing: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.moderationQueue.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      items,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get moderation queue error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea queue-ului" },
      { status: 500 }
    );
  }
}
