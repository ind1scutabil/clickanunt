export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission, Permission, canSetRole } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { validateSecureRequest } from "@/lib/security/middleware";
import {
  resolveAdminUsersListLimit,
  resolveAdminUsersOffset,
} from "@/lib/admin/users-query";
import {
  EMAIL_VERIFY_PURPOSE,
  issueAndDispatchEmailVerification,
} from "@/lib/auth/email-verification";

const adminCreateUserSchema = z
  .object({
    email: z.string().email("Email invalid").max(255),
    password: z.string().min(8).max(128),
    role: z.enum(["user", "dealer", "moderator", "admin", "owner", "support", "finance"]).optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getUserFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }
    if (!hasPermission(adminUser.role as UserRole, Permission.USERS_VIEW_ALL)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    await db.testConnection();

    const { searchParams } = new URL(request.url);
    const take = resolveAdminUsersListLimit(searchParams.get("limit"));
    const skip = resolveAdminUsersOffset(searchParams.get("offset"));

    const allUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    return NextResponse.json(allUsers || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Eroare internă";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getUserFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }
    if (!hasPermission(adminUser.role as UserRole, Permission.USERS_CREATE)) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: "register",
      schema: adminCreateUserSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { email, password, role: requestedRole } = security.data as z.infer<
      typeof adminCreateUserSchema
    >;

    const roleToAssign = (requestedRole ?? "user") as UserRole;
    if (!canSetRole({ role: adminUser.role as UserRole }, roleToAssign)) {
      return NextResponse.json(
        { error: "Nu poți atribui acest rol" },
        { status: 403 }
      );
    }

    const existingUser = await db.findUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { error: "Un cont cu acest email exista deja" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.createUser({
      email,
      password: hashedPassword,
      role: roleToAssign,
      emailVerified: false,
    });

    let emailDispatchAccepted = false;
    try {
      const dispatched = await issueAndDispatchEmailVerification({
        userId: (user as { id: string }).id,
        email,
        purpose: EMAIL_VERIFY_PURPOSE,
      });
      emailDispatchAccepted = dispatched.accepted;
    } catch {
      /* non-blocking */
    }

    const { password: _, ...userWithoutSensitiveData } = user as Record<string, unknown>;

    return NextResponse.json(
      {
        ...userWithoutSensitiveData,
        emailDispatchAccepted,
        message: emailDispatchAccepted
          ? "Cont creat cu succes! Verifică-ți emailul pentru a confirma adresa."
          : "Cont creat cu succes. Trimiterea emailului de verificare a eșuat temporar.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Eroare internă";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
