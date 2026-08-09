/**
 * HTML /listings/[id] access — aligned with GET /api/listings/[id] for anonymous vs owner/admin.
 * Public viewers only see indexable listings; otherwise Next.js notFound() → real HTTP 404.
 */
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { UserRole } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/rbac";
import { isListingSeoIndexable } from "@/lib/seo/listing-seo-eligibility";
import { uuidSchema } from "@/lib/security/validation-schemas";

async function viewerFromCookies() {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  if (!cookieHeader) return null;
  const req = new NextRequest("http://localhost/listings", {
    headers: { cookie: cookieHeader },
  });
  return getUserFromRequest(req);
}

/**
 * Whether the current request may render the listing detail HTML shell.
 * - Indexable public listing → true
 * - Missing / soft-deleted / non-indexable for anonymous → false
 * - Non-indexable but owner/admin → true (client loads payload from API with cookies)
 */
export async function canRenderListingDetailHtml(id: string): Promise<boolean> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return false;
  // In-memory / test mode: keep client+API path (same as getPublicListingDetailForSsr).
  if (process.env.USE_IN_MEMORY_DB === "true") return true;

  const listing = await prisma.listing.findFirst({
    where: { id, deletedAt: null },
    select: {
      ownerUserId: true,
      deletedAt: true,
      status: true,
      moderationStatus: true,
      expiresAt: true,
    },
  });
  if (!listing) return false;

  if (isListingSeoIndexable(listing)) return true;

  const viewer = await viewerFromCookies();
  if (!viewer) return false;

  return (
    viewer.id === listing.ownerUserId ||
    hasPermission(viewer.role as UserRole, Permission.LISTINGS_UPDATE_ANY) ||
    hasPermission(viewer.role as UserRole, Permission.MODERATION_APPROVE_REJECT)
  );
}
