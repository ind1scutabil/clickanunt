/**
 * Legacy user-by-id CRUD — previously unauthenticated (P0).
 * Public seller data: GET /api/users/[id]/profile
 * Self settings: /api/users/me
 * Admin role/ban: /api/admin/users/...
 *
 * Hard DELETE is refused — Payment/Invoice must not cascade-destroy.
 */
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission, canModifyUser, canSetRole } from "@/lib/rbac";
import { validateSecureRequest } from "@/lib/security/middleware";
import { createAuditLog } from "@/lib/audit";
import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { uuidSchema } from "@/lib/security/validation-schemas";

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  accountType: true,
  subscriptionTier: true,
  isBanned: true,
  deletedAt: true,
  createdAt: true,
  emailVerified: true,
  phoneVerified: true,
  trustScore: true,
} as const;

const patchSchema = z
  .object({
    email: z.string().email().optional(),
    role: z
      .enum(["user", "dealer", "admin", "moderator", "owner", "support", "finance"])
      .optional(),
  })
  .strict();

async function requireAdminActor(request: NextRequest) {
  const actor = await getUserFromRequest(request);
  if (!actor) {
    return { error: NextResponse.json({ error: "Neautentificat" }, { status: 401 }) };
  }
  return { actor };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminActor(request);
    if ("error" in auth && auth.error) return auth.error;
    const actor = auth.actor!;

    if (!hasPermission(actor.role as UserRole, Permission.USERS_VIEW_ALL)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID invalid" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminActor(request);
    if ("error" in auth && auth.error) return auth.error;
    const actor = auth.actor!;

    if (!hasPermission(actor.role as UserRole, Permission.USERS_UPDATE_ANY)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID invalid" }, { status: 400 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "api",
      schema: patchSchema,
    });
    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const body = security.data as z.infer<typeof patchSchema>;
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!canModifyUser(actor.role as UserRole, target.role as UserRole)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const data: { email?: string; role?: UserRole } = {};
    if (body.email !== undefined) {
      data.email = body.email.toLowerCase().trim();
    }
    if (body.role !== undefined) {
      if (
        !hasPermission(actor.role as UserRole, Permission.USERS_CHANGE_ROLE) ||
        !canSetRole({ role: actor.role as UserRole }, body.role as UserRole)
      ) {
        return NextResponse.json(
          { error: "Nu poți seta acest rol" },
          { status: 403 }
        );
      }
      data.role = body.role as UserRole;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nicio modificare" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: SAFE_USER_SELECT,
    });

    await createAuditLog({
      userId: actor.id,
      action: "admin.user.patch_legacy",
      resource: "user",
      resourceId: id,
      details: { fields: Object.keys(data) },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

/**
 * Hard delete refused — would cascade-destroy Payment/Invoice.
 * Use soft-deactivate (self or admin ban/suspend flows).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminActor(request);
    if ("error" in auth && auth.error) return auth.error;
    const actor = auth.actor!;

    if (!hasPermission(actor.role as UserRole, Permission.USERS_DELETE)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "ID invalid" }, { status: 400 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "api",
    });
    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, deletedAt: true },
    });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!canModifyUser(actor.role as UserRole, target.role as UserRole)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    if (target.role === "admin" || target.role === "owner") {
      return NextResponse.json(
        { error: "Conturile administrator nu pot fi dezactivate astfel" },
        { status: 403 }
      );
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { deletedAt: target.deletedAt ?? now },
      }),
      prisma.listing.updateMany({
        where: {
          ownerUserId: id,
          deletedAt: null,
          status: { in: ["active", "pending", "draft", "paused"] },
        },
        data: { status: "paused" },
      }),
    ]);

    await createAuditLog({
      userId: actor.id,
      action: "admin.user.soft_deactivate",
      resource: "user",
      resourceId: id,
      details: { at: now.toISOString(), hardDeleteRefused: true },
    });

    return NextResponse.json({
      success: true,
      softDeleted: true,
      message:
        "Contul a fost dezactivat (soft). Datele de plată/facturi sunt păstrate. Hard delete este dezactivat.",
    });
  } catch {
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
