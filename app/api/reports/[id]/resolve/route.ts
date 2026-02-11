import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deductTrustPoints, awardTrustPoints } from "@/lib/trustScore";
import { createAuditLog } from "@/lib/audit";
import { logger } from "@/lib/observability";
import { validateSecureRequest } from "@/lib/security/middleware";
import { reportResolveSchema } from "@/lib/security/validation-schemas";
import { verifyAccessToken } from "@/lib/security/tokens";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Resolve a report (admin/moderator only)
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const security = await validateSecureRequest(request as NextRequest, {
      requireCSRF: true,
      rateLimit: 'moderation',
      schema: reportResolveSchema,
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

    const { action, resolution } = security.data as { action: 'approve' | 'dismiss'; resolution?: string };

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || null;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload || (payload.role !== 'admin' && payload.role !== 'owner' && payload.role !== 'moderator')) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }
    const moderatorId = payload.userId;

    // Validate action
    if (!["approve", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'dismiss'" },
        { status: 400 }
      );
    }

    // Fetch report
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: true,
        listing: true
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    if (report.status !== "pending") {
      return NextResponse.json(
        { error: "Report already resolved" },
        { status: 400 }
      );
    }

    // Update report status
    const newStatus = action === "approve" ? "resolved" : "dismissed";
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: newStatus,
        resolvedAt: new Date(),
        resolvedBy: moderatorId,
        resolution
      }
    });

    // If approved, take action on reported content
    if (action === "approve") {
      // Deduct trust points from listing owner
      if (report.listing?.ownerUserId) {
        await deductTrustPoints(
          report.listing.ownerUserId,
          10,
          `Valid report: ${report.reason}`
        );

        logger.info("Trust points deducted for valid report", {
          userId: report.listing.ownerUserId,
          reportId: id,
          reason: report.reason
        });
      }

      // Flag the listing
      await prisma.listing.update({
        where: { id: report.listingId },
        data: {
          moderationStatus: "flagged"
        }
      });

      logger.info("Listing flagged due to valid report", {
        listingId: report.listingId,
        reportId: id
      });

      // Award trust points to reporter for valid report
      if (report.reporterId) {
        await awardTrustPoints(
          report.reporterId,
          5,
          `Valid report submitted: ${report.reason}`
        );
      }
    }

    // Audit log
    await createAuditLog({
      userId: moderatorId,
      action: `report_${action}`,
      resource: "report",
      resourceId: id,
      details: {
        reportReason: report.reason,
        listingId: report.listingId,
        resolution
      }
    });

    logger.info("Report resolved", {
      reportId: id,
      action,
      moderatorId
    });

    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: action === "approve" 
        ? "Raportul a fost aprobat și au fost luate măsuri"
        : "Raportul a fost respins"
    });

  } catch (error: any) {
    logger.error("Error resolving report", error);
    return NextResponse.json(
      { error: "Failed to resolve report", details: error.message },
      { status: 500 }
    );
  }
}
