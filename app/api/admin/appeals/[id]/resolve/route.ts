/**
 * API Route: Admin - Resolve Appeal
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.APPEALS_REVIEW)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, response } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status este necesar" },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: "Status invalid (approved sau rejected)" },
        { status: 400 }
      );
    }

    // Update appeal
    const appeal = await prisma.appeal.update({
      where: { id },
      data: {
        status,
        response: response || null,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ appeal });
  } catch (error) {
    console.error('Error resolving appeal:', error);
    return NextResponse.json(
      { error: 'Eroare la rezolvarea apelului' },
      { status: 500 }
    );
  }
}
