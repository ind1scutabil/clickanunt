import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logger } from "@/lib/observability";
import { verifyToken } from "@/lib/auth";
import { validateSecureRequest } from "@/lib/security/middleware";
import { reportCreateSchema } from "@/lib/security/validation-schemas";

export async function POST(request: NextRequest) {
  try {
    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'reports',
      schema: reportCreateSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
        ? 403
        : security.validationError
        ? 400
        : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { reporterId, listingId, reason, description } = security.data as {
      reporterId: string;
      listingId: string;
      reason: string;
      description: string;
    };

    // Validation
    if (!reporterId || !reason || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!listingId) {
      return NextResponse.json(
        { error: "Must report a listing" },
        { status: 400 }
      );
    }

    // Check if reporter exists
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
      select: { trustScore: true, email: true, role: true }
    });

    if (!reporter) {
      return NextResponse.json(
        { error: "Reporter not found" },
        { status: 404 }
      );
    }

    // Check reporter trust score (prevent spam reporting)
    if (reporter.trustScore < 50) {
      return NextResponse.json(
        { error: "Scor de încredere insuficient pentru a raporta" },
        { status: 403 }
      );
    }

    // Check for duplicate reports (same reporter, same listing, within 24h)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const duplicateReport = await prisma.report.findFirst({
      where: {
        reporterId,
        listingId,
        createdAt: { gte: yesterday }
      }
    });

    if (duplicateReport) {
      return NextResponse.json(
        { error: "Ai raportat deja acest conținut în ultimele 24 ore" },
        { status: 429 }
      );
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId,
        listingId,
        reason,
        description,
        status: "pending"
      },
      include: {
        reporter: {
          select: { email: true, role: true }
        },
        listing: {
          select: { id: true, title: true, category: true, ownerUserId: true }
        }
      }
    });

    // Audit log
    await createAuditLog({
      userId: reporterId,
      action: "report_created",
      resource: "listing",
      resourceId: listingId,
      details: {
        reportId: report.id,
        reason,
        description
      }
    });

    logger.info("Report created", { 
      reportId: report.id, 
      reporterId, 
      reason,
      listingId
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: "Raportul tău a fost trimis. Îl vom analiza în cel mai scurt timp."
    }, { status: 201 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error creating report", error);
    return NextResponse.json(
      { error: "Failed to create report", details: errorMessage },
      { status: 500 }
    );
  }
}

// Get reports (admin only)
export async function GET(request: Request) {
  try {
    // Admin authentication check
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check if user is admin or owner
    if (payload.role !== 'admin' && payload.role !== 'owner') {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const reports = await prisma.report.findMany({
      where: {
        status: status as 'pending' | 'resolved' | 'investigating' | 'dismissed' | undefined
      },
      include: {
        reporter: {
          select: { id: true, email: true, trustScore: true }
        },
        listing: {
          select: { id: true, title: true, category: true, status: true, ownerUserId: true }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      skip: offset
    });

    const total = await prisma.report.count({
      where: { status: status as 'pending' | 'resolved' | 'investigating' | 'dismissed' | undefined }
    });

    return NextResponse.json({
      reports,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Error fetching reports", error);
    return NextResponse.json(
      { error: "Failed to fetch reports", details: errorMessage },
      { status: 500 }
    );
  }
}
