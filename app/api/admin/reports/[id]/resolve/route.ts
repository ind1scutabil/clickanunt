/**
 * API Route: Admin - Resolve Report
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.REPORTS_RESOLVE)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { resolution, status } = body;

    if (!resolution || !status) {
      return NextResponse.json(
        { error: "Resolution și status sunt necesare" },
        { status: 400 }
      );
    }

    if (!['resolved', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: "Status invalid" },
        { status: 400 }
      );
    }

    // Update report
    const report = await prisma.report.update({
      where: { id },
      data: {
        status,
        resolution,
        resolvedAt: new Date(),
        resolvedBy: user.userId,
      },
      include: {
        reporter: true,
      },
    });

    // Audit log
    await auditActions.reportResolved(user, report, resolution);

    return NextResponse.json({
      success: true,
      message: "Raport rezolvat cu succes",
      report,
    });
  } catch (error) {
    console.error('Resolve report error:', error);
    return NextResponse.json(
      { error: "Eroare la rezolvarea raportului" },
      { status: 500 }
    );
  }
}
