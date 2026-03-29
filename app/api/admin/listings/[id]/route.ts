/**
 * Admin: moderare anunțuri (status, featured, note) și ștergere
 */

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { ListingStatus, ModerationStatus, type UserRole, type Prisma } from "@prisma/client";
import { validateSecureRequest } from "@/lib/security/middleware";
import { createAuditLog } from "@/lib/audit";
import { uuidSchema } from "@/lib/security/validation-schemas";
import { computeFeedBoost } from "@/lib/listing-feed-boost";

const adminListingPatchSchema = z
  .object({
    status: z.nativeEnum(ListingStatus).optional(),
    moderationNotes: z.string().max(2000).optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict()
  .refine((d) => d.status !== undefined || d.moderationNotes !== undefined || d.isFeatured !== undefined, {
    message: "Furnizează cel puțin: status, moderationNotes sau isFeatured",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idCheck = uuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: "ID anunț invalid" }, { status: 400 });
    }

    const adminUser = await getUserFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }
    const canModerate =
      hasPermission(adminUser.role as UserRole, Permission.LISTINGS_UPDATE_ANY) ||
      hasPermission(adminUser.role as UserRole, Permission.MODERATION_APPROVE_REJECT);
    if (!canModerate) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "moderation",
      schema: adminListingPatchSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const data = security.data as z.infer<typeof adminListingPatchSchema>;

    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, title: true, ownerUserId: true, status: true, isPromoted: true, isFeatured: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Anunțul nu a fost găsit" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      moderatedAt: new Date(),
      moderatedBy: adminUser.id,
    };

    if (data.moderationNotes !== undefined) {
      updateData.moderationNotes = data.moderationNotes;
    }

    if (data.isFeatured !== undefined) {
      updateData.isFeatured = data.isFeatured;
      updateData.feedBoost = computeFeedBoost(!!existing.isPromoted, data.isFeatured);
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === ListingStatus.active) {
        updateData.moderationStatus = ModerationStatus.approved;
        updateData.publishedAt = new Date();
      } else if (data.status === ListingStatus.rejected || data.status === ListingStatus.hidden) {
        updateData.moderationStatus = ModerationStatus.rejected;
      } else if (data.status === ListingStatus.pending) {
        updateData.moderationStatus = ModerationStatus.pending;
      }
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: updateData as Prisma.ListingUpdateInput,
      select: {
        id: true,
        title: true,
        status: true,
        moderationStatus: true,
        isFeatured: true,
        moderationNotes: true,
        ownerUserId: true,
      },
    });

    if (data.status !== undefined) {
      let title: string | null = null;
      let message: string | null = null;
      const reason = data.moderationNotes?.trim() || listing.moderationNotes?.trim() || null;

      if (data.status === ListingStatus.hidden || data.status === ListingStatus.paused) {
        title = "Anunt suspendat temporar";
        message = reason
          ? `Anuntul "${existing.title}" a fost suspendat de moderare. Motiv: ${reason}`
          : `Anuntul "${existing.title}" a fost suspendat de moderare.`;
      } else if (data.status === ListingStatus.rejected) {
        title = "Anunt respins";
        message = reason
          ? `Anuntul "${existing.title}" a fost respins. Motiv: ${reason}`
          : `Anuntul "${existing.title}" a fost respins de moderare.`;
      } else if (data.status === ListingStatus.active && existing.status !== ListingStatus.active) {
        title = "Anunt reactivat";
        message = `Anuntul "${existing.title}" a fost reactivat si este din nou vizibil.`;
      } else if (data.status === ListingStatus.pending) {
        title = "Anunt in asteptare";
        message = `Anuntul "${existing.title}" este in asteptare pentru verificare.`;
      }

      if (title && message) {
        await prisma.userNotification.create({
          data: {
            userId: existing.ownerUserId,
            title,
            message,
          },
        });
      }
    }

    await createAuditLog({
      userId: adminUser.id,
      action: "listing.admin_update",
      resource: "listing",
      resourceId: id,
      details: {
        previousStatus: existing.status,
        patch: data,
        targetOwnerId: existing.ownerUserId,
      },
    });

    return NextResponse.json({ success: true, listing });
  } catch (error) {
    console.error("Admin listing PATCH error:", error);
    return NextResponse.json({ error: "Eroare la actualizarea anunțului" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idCheck = uuidSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: "ID anunț invalid" }, { status: 400 });
    }

    const adminUser = await getUserFromRequest(request);
    if (!adminUser || !hasPermission(adminUser.role as UserRole, Permission.LISTINGS_DELETE_ANY)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "moderation",
    });

    if (!security.success) {
      const status = security.rateLimitError ? 429 : security.csrfError ? 403 : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const existing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, title: true, ownerUserId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Anunțul nu a fost găsit" }, { status: 404 });
    }

    await prisma.listing.delete({ where: { id } });

    await createAuditLog({
      userId: adminUser.id,
      action: "listing.admin_delete",
      resource: "listing",
      resourceId: id,
      details: {
        title: existing.title,
        targetOwnerId: existing.ownerUserId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin listing DELETE error:", error);
    return NextResponse.json({ error: "Eroare la ștergerea anunțului" }, { status: 500 });
  }
}
