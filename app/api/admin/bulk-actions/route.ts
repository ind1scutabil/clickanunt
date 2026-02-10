/**
 * API Route: Admin - Bulk Actions
 */

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { auditActions } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request as any);

    if (!user || !hasPermission(user.role as UserRole, Permission.USERS_BAN)) {
      return NextResponse.json(
        { error: "Acces interzis" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, entityType, entityIds, data } = body;

    if (!action || !entityType || !Array.isArray(entityIds) || entityIds.length === 0) {
      return NextResponse.json(
        { error: "Action, entityType și entityIds sunt necesare" },
        { status: 400 }
      );
    }

    // Limit bulk operations
    if (entityIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 items per bulk operation" },
        { status: 400 }
      );
    }

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
          await prisma.listing.update({
            where: { id: listingId },
            data: {
              moderationStatus: 'approved',
              moderatedAt: new Date(),
              moderatedBy: user.id,
              status: 'active',
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

    // Bulk delete listings
    else if (action === 'delete_listings' && entityType === 'listing') {
      if (!hasPermission(user.role as UserRole, Permission.LISTINGS_DELETE_ANY)) {
        return NextResponse.json(
          { error: "Nu ai permisiune să ștergi listings" },
          { status: 403 }
        );
      }

      for (const listingId of entityIds) {
        try {
          const listing = await prisma.listing.findUnique({ where: { id: listingId } });
          
          await prisma.listing.delete({ where: { id: listingId } });

          if (listing) {
            await auditActions.listingDeleted(user, listingId, listing);
          }

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
