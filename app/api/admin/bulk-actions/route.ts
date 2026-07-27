/**
 * API Route: Admin - Bulk Actions
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import { validateSecureRequest } from "@/lib/security/middleware";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { applyListingPublishExpiryOnApprove } from "@/lib/listing-lifecycle";

const bulkActionSchema = z.object({
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityIds: z.array(z.string()).min(1).max(100),
  data: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_BAN)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      schema: bulkActionSchema,
    });

    if (!security.success) {
      const status = security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { action, entityType, entityIds, data } = security.data as {
      action: string;
      entityType: string;
      entityIds: string[];
      data?: Record<string, any>;
    };

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Bulk ban users
    if (action === 'ban_users' && entityType === 'user') {
      const reason = data?.reason || 'Bulk ban operation';

      for (const userId of entityIds) {
        try {
          const targetUser = await prisma.user.findUnique({ where: { id: userId } });
          
          if (!targetUser || targetUser.role === 'owner') {
            results.errors.push(`Cannot ban user ${userId}`);
            results.failed++;
            continue;
          }

          await prisma.user.update({
            where: { id: userId },
            data: {
              isBanned: true,
              bannedAt: new Date(),
              bannedBy: user.id,
              banReason: reason,
            },
          });

          await auditActions.userBanned(user, userId, reason, targetUser);
          results.success++;
        } catch (error: any) {
          results.errors.push(`Error banning ${userId}: ${error.message}`);
          results.failed++;
        }
      }
    }

    // Bulk approve listings
    else if (action === 'approve_listings' && entityType === 'listing') {
      for (const listingId of entityIds) {
        try {
          const existing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { publishedAt: true, expiresAt: true, deletedAt: true },
          });
          if (!existing || existing.deletedAt) {
            results.errors.push(`Listing missing ${listingId}`);
            results.failed++;
            continue;
          }

          await prisma.listing.update({
            where: { id: listingId },
            data: {
              moderationStatus: 'approved',
              moderatedAt: new Date(),
              moderatedBy: user.id,
              status: 'active',
              ...applyListingPublishExpiryOnApprove(existing),
            },
          });

          const listing = await prisma.listing.findUnique({ where: { id: listingId } });
          if (listing) {
            await auditActions.listingApproved(user, listing);
          }
          
          results.success++;
        } catch (error: any) {
          results.errors.push(`Error approving ${listingId}: ${error.message}`);
          results.failed++;
        }
      }
    }

    // Bulk reject listings
    else if (action === 'reject_listings' && entityType === 'listing') {
      const reason = data?.reason || 'Bulk rejection';

      for (const listingId of entityIds) {
        try {
          await prisma.listing.update({
            where: { id: listingId },
            data: {
              moderationStatus: 'rejected',
              moderatedAt: new Date(),
              moderatedBy: user.id,
              moderationNotes: reason,
              status: 'rejected',
            },
          });

          const listing = await prisma.listing.findUnique({ where: { id: listingId } });
          if (listing) {
            await auditActions.listingRejected(user, listing, reason);
          }

          results.success++;
        } catch (error: any) {
          results.errors.push(`Error rejecting ${listingId}: ${error.message}`);
          results.failed++;
        }
      }
    }

    // Bulk soft-delete listings (never hard-delete — preserves relations + Payment/Invoice)
    else if (action === 'delete_listings' && entityType === 'listing') {
      if (!hasPermission(user.role as UserRole, Permission.LISTINGS_DELETE_ANY)) {
        return NextResponse.json(
          { error: "Nu ai permisiune să ștergi listings" },
          { status: 403 }
        );
      }

      const reason =
        typeof data?.reason === 'string' && data.reason.trim().length >= 3
          ? data.reason.trim().slice(0, 2000)
          : 'Bulk soft-delete';

      for (const listingId of entityIds) {
        try {
          const listing = await prisma.listing.findFirst({
            where: { id: listingId, deletedAt: null },
          });
          if (!listing) {
            results.errors.push(`Listing missing ${listingId}`);
            results.failed++;
            continue;
          }

          const updated = await prisma.listing.updateMany({
            where: { id: listingId, deletedAt: null },
            data: {
              status: 'deleted',
              deletedAt: new Date(),
              moderationNotes: reason,
              moderatedAt: new Date(),
              moderatedBy: user.id,
            },
          });

          if (updated.count === 0) {
            results.errors.push(`Already deleted ${listingId}`);
            results.failed++;
            continue;
          }

          await auditActions.listingDeleted(user, listingId, listing);
          results.success++;
        } catch (error: any) {
          results.errors.push(`Error deleting ${listingId}: ${error.message}`);
          results.failed++;
        }
      }
    }

    else {
      return NextResponse.json(
        { error: "Action invalid sau nu e suportat" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Bulk operation completed: ${results.success} succeeded, ${results.failed} failed`,
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { error: "Eroare la executarea bulk action" },
      { status: 500 }
    );
  }
}
