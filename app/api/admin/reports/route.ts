/**
 * API Route: Admin - Reports Management
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.REPORTS_VIEW)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          resolvedByUser: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      reports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: "Eroare la obținerea rapoartelor" },
      { status: 500 }
    );
  }
}
