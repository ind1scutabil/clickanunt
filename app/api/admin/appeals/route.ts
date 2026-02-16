/**
 * API Route: Admin - Get Appeals
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

    if (!user || !hasPermission(user.role as UserRole, Permission.APPEALS_VIEW_ALL)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const appeals = await prisma.appeal.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            accountType: true,
            phone: true,
            createdAt: true,
            trustScore: true,
            totalListings: true,
            isBanned: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ appeals });
  } catch (error) {
    console.error('Error fetching appeals:', error);
    return NextResponse.json(
      { error: 'Eroare la preluarea apelurilor' },
      { status: 500 }
    );
  }
}
